import contextlib
from datetime import UTC, datetime
from typing import Any, Literal, cast

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel

from api.deps import require_admin
from core.db import first
from db.supabase_client import get_service_role_client
from middleware.admin_audit import log_admin_action
from models.types import JobType

RejectionReasonType = Literal[
    "permanently_closed",
    "not_a_cafe",
    "duplicate",
    "outside_coverage",
    "invalid_url",
    "other",
]


class RejectSubmissionRequest(BaseModel):
    rejection_reason: RejectionReasonType


class BulkApproveSubmissionsRequest(BaseModel):
    submission_ids: list[str]


class BulkRejectSubmissionsRequest(BaseModel):
    submission_ids: list[str]
    rejection_reason: RejectionReasonType


logger = structlog.get_logger()

router = APIRouter(prefix="/admin/pipeline", tags=["admin"])


@router.get("/overview")
async def pipeline_overview(
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Job counts by status, recent submissions."""
    db = get_service_role_client()

    # Count jobs by status — single GROUP BY query instead of N+1
    counts_response = db.rpc("job_queue_counts_by_status", {}).execute()
    counts_data = cast("list[dict[str, Any]]", counts_response.data or [])
    job_counts: dict[str, int] = {row["status"]: int(row["count"]) for row in counts_data}

    # Recent submissions
    subs_response = (
        db.table("shop_submissions").select("*").order("created_at", desc=True).limit(20).execute()
    )

    return {
        "job_counts": job_counts,
        "recent_submissions": subs_response.data,
    }


@router.get("/submissions")
async def list_submissions(
    status: str | None = None,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> list[dict[str, Any]]:
    """List shop submissions, optionally filtered by status."""
    db = get_service_role_client()
    query = (
        db.table("shop_submissions")
        .select("*, shops(name, processing_status, address)")
        .order("created_at", desc=True)
        .limit(50)
    )
    if status:
        query = query.eq("status", status)
    response = query.execute()
    return cast("list[dict[str, Any]]", response.data)


@router.get("/dead-letter")
async def dead_letter_jobs(
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> list[dict[str, Any]]:
    """Failed jobs for investigation."""
    db = get_service_role_client()
    response = (
        db.table("job_queue")
        .select("*")
        .in_("status", ["failed", "dead_letter"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return cast("list[dict[str, Any]]", response.data)


@router.post("/retry/{job_id}")
async def retry_job(
    job_id: str,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Manually retry a failed/dead-letter job."""
    db = get_service_role_client()

    job_response = db.table("job_queue").select("id, status").eq("id", job_id).execute()
    if not job_response.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job_status = first(cast("list[dict[str, Any]]", job_response.data), "fetch job")["status"]
    if job_status not in ("failed", "dead_letter"):
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} is not retryable (status: {job_status})",
        )

    # Conditional update — only succeeds if job is still in a retryable state (TOCTOU guard)
    update_response = (
        db.table("job_queue")
        .update({"status": "pending", "attempts": 0, "last_error": None, "claimed_at": None})
        .eq("id", job_id)
        .in_("status", ["failed", "dead_letter"])
        .execute()
    )
    if not update_response.data:
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} status changed concurrently — refresh and retry",
        )
    log_admin_action(
        admin_user_id=user["id"],
        action=f"POST /admin/pipeline/retry/{job_id}",
        target_type="job",
        target_id=job_id,
    )
    return {"message": f"Job {job_id} re-queued"}


@router.post("/approve/{submission_id}")
async def approve_submission(
    submission_id: str,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Approve a submission — set shop live, emit activity feed, record review."""
    db = get_service_role_client()

    sub_response = (
        db.table("shop_submissions")
        .select("id, status, shop_id, submitted_by")
        .eq("id", submission_id)
        .execute()
    )
    if not sub_response.data:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")

    sub_data = first(cast("list[dict[str, Any]]", sub_response.data), "fetch submission")
    sub_status = sub_data["status"]
    shop_id = sub_data.get("shop_id")
    submitted_by = sub_data.get("submitted_by")

    if sub_status not in ("pending", "processing", "pending_review"):
        raise HTTPException(
            status_code=409,
            detail=f"Submission {submission_id} cannot be approved (status: {sub_status})",
        )

    if not shop_id:
        raise HTTPException(
            status_code=422,
            detail=f"Submission {submission_id} has no associated shop — cannot approve",
        )

    now = datetime.now(UTC).isoformat()

    # Conditional update — only succeeds if submission is still approvable (TOCTOU guard)
    update_response = (
        db.table("shop_submissions")
        .update({"status": "live", "reviewed_at": now})
        .eq("id", submission_id)
        .in_("status", ["pending", "processing", "pending_review"])
        .execute()
    )
    if not update_response.data:
        raise HTTPException(
            status_code=409,
            detail=f"Submission {submission_id} status changed concurrently — refresh and retry",
        )

    # Set the associated shop to live
    shop_update = (
        db.table("shops")
        .update({"processing_status": "live", "updated_at": now})
        .eq("id", shop_id)
        .select("name")
        .execute()
    )
    shop_rows = cast("list[dict[str, Any]]", shop_update.data or [])
    shop_name = shop_rows[0].get("name", "Unknown") if shop_rows else "Unknown"

    # Emit activity feed event for user-submitted shops
    if submitted_by:
        db.table("activity_feed").insert(
            {
                "event_type": "shop_added",
                "actor_id": submitted_by,
                "shop_id": shop_id,
                "metadata": {"shop_name": shop_name},
            }
        ).execute()

    log_admin_action(
        admin_user_id=user["id"],
        action=f"POST /admin/pipeline/approve/{submission_id}",
        target_type="submission",
        target_id=submission_id,
        payload={"shop_id": str(shop_id) if shop_id else None},
    )
    return {"message": f"Submission {submission_id} approved"}


@router.post("/approve-bulk")
async def approve_submissions_bulk(
    body: BulkApproveSubmissionsRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    if len(body.submission_ids) > 50:
        raise HTTPException(
            status_code=400, detail="Maximum 50 submissions per bulk-approve request"
        )

    db = get_service_role_client()
    now = datetime.now(tz=UTC).isoformat()
    approved = 0
    skipped = 0
    failed: list[str] = []

    # Batch-fetch all submissions in one IN() query to avoid N+1 reads
    all_subs_res = (
        db.table("shop_submissions")
        .select("id, status, shop_id, submitted_by")
        .in_("id", body.submission_ids)
        .execute()
    )
    subs_by_id: dict[str, dict[str, Any]] = {
        row["id"]: row for row in cast("list[dict[str, Any]]", all_subs_res.data or [])
    }

    for submission_id in body.submission_ids:
        sub = subs_by_id.get(submission_id)
        if sub is None:
            skipped += 1
            continue
        if sub["status"] not in ("pending", "processing", "pending_review"):
            skipped += 1
            continue

        update_res = (
            db.table("shop_submissions")
            .update({"status": "live", "reviewed_at": now})
            .eq("id", submission_id)
            .in_("status", ["pending", "processing", "pending_review"])
            .execute()
        )
        if not (update_res.data or []):
            skipped += 1
            continue

        shop_update = (
            db.table("shops")
            .update({"processing_status": "live", "updated_at": now})
            .eq("id", sub["shop_id"])
            .select("name")
            .execute()
        )
        shop_rows = cast("list[dict[str, Any]]", shop_update.data or [])
        shop_name = first(shop_rows).get("name", "Unknown") if shop_rows else "Unknown"

        if sub.get("submitted_by"):
            db.table("activity_feed").insert(
                {
                    "event_type": "shop_added",
                    "actor_id": sub["submitted_by"],
                    "shop_id": sub["shop_id"],
                    "metadata": {"shop_name": shop_name},
                }
            ).execute()

        approved += 1

    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/pipeline/approve-bulk",
        target_type="submission",
        payload={"approved": approved, "skipped": skipped},
    )
    return {"approved": approved, "skipped": skipped, "failed": failed}


@router.post("/reject-bulk")
async def reject_submissions_bulk(
    body: BulkRejectSubmissionsRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    if len(body.submission_ids) > 50:
        raise HTTPException(
            status_code=400, detail="Maximum 50 submissions per bulk-reject request"
        )

    db = get_service_role_client()
    now = datetime.now(tz=UTC).isoformat()
    rejected = 0
    skipped = 0

    # Batch-fetch all submissions in one IN() query to avoid N+1 reads
    all_subs_res = (
        db.table("shop_submissions")
        .select("id, status, shop_id")
        .in_("id", body.submission_ids)
        .execute()
    )
    subs_by_id: dict[str, dict[str, Any]] = {
        row["id"]: row for row in cast("list[dict[str, Any]]", all_subs_res.data or [])
    }

    for submission_id in body.submission_ids:
        sub = subs_by_id.get(submission_id)
        if sub is None:
            skipped += 1
            continue
        if sub["status"] in ("live", "rejected"):
            skipped += 1
            continue

        update_res = (
            db.table("shop_submissions")
            .update(
                {
                    "status": "rejected",
                    "rejection_reason": body.rejection_reason,
                    "reviewed_at": now,
                }
            )
            .eq("id", submission_id)
            .not_.in_("status", ["live", "rejected"])
            .execute()
        )
        if not (update_res.data or []):
            skipped += 1
            continue

        db.rpc(
            "cancel_shop_jobs",
            {"p_shop_id": sub["shop_id"], "p_reason": body.rejection_reason},
        ).execute()
        db.table("shops").update({"processing_status": "rejected"}).eq(
            "id", sub["shop_id"]
        ).execute()
        rejected += 1

    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/pipeline/reject-bulk",
        target_type="submission",
        payload={"rejected": rejected, "skipped": skipped, "reason": body.rejection_reason},
    )
    return {"rejected": rejected, "skipped": skipped}


@router.post("/reject/{submission_id}")
async def reject_submission(
    submission_id: str,
    body: RejectSubmissionRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Reject a submission — mark rejected with reason, set shop to rejected."""
    db = get_service_role_client()

    sub_response = (
        db.table("shop_submissions").select("shop_id, status").eq("id", submission_id).execute()
    )
    if not sub_response.data:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")
    sub_data = first(cast("list[dict[str, Any]]", sub_response.data), "fetch submission")
    sub_status = sub_data.get("status")
    shop_id = sub_data.get("shop_id")

    if sub_status == "live":
        raise HTTPException(
            status_code=409,
            detail=f"Submission {submission_id} is already live — cannot reject a published shop",
        )

    now = datetime.now(UTC).isoformat()

    # Conditional update — only succeeds if submission is still rejectable (TOCTOU guard)
    reject_response = (
        db.table("shop_submissions")
        .update(
            {
                "status": "rejected",
                "rejection_reason": body.rejection_reason,
                "reviewed_at": now,
            }
        )
        .eq("id", submission_id)
        .in_("status", ["pending", "processing", "pending_review"])
        .execute()
    )
    if not reject_response.data:
        raise HTTPException(
            status_code=409,
            detail=f"Submission {submission_id} status changed concurrently — refresh and retry",
        )

    if shop_id:
        # Cancel in-flight jobs for this shop
        db.rpc(
            "cancel_shop_jobs",
            {
                "p_shop_id": str(shop_id),
                "p_reason": f"Submission rejected: {body.rejection_reason}",
            },
        ).execute()
        # Set shop to rejected instead of deleting
        db.table("shops").update({"processing_status": "rejected", "updated_at": now}).eq(
            "id", shop_id
        ).execute()

    log_admin_action(
        admin_user_id=user["id"],
        action=f"POST /admin/pipeline/reject/{submission_id}",
        target_type="submission",
        target_id=submission_id,
        payload={"shop_id": str(shop_id) if shop_id else None, "reason": body.rejection_reason},
    )
    return {"message": f"Submission {submission_id} rejected"}


@router.get("/batches")
async def list_batches(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """List batch runs grouped by batch_id with per-status shop counts.

    Uses scrape_batch format: one job per batch with shops in payload.shops[].
    """
    db = get_service_role_client()

    batch_job_cap = 5000
    # Fetch scrape_batch jobs only — capped to prevent full table scan at scale
    response = (
        db.table("job_queue")
        .select("job_type, payload, created_at")
        .eq("job_type", JobType.SCRAPE_BATCH.value)
        .order("created_at", desc=True)
        .limit(batch_job_cap)
        .execute()
    )
    if len(response.data or []) == batch_job_cap:
        logger.warning("list_batches: hit job cap — oldest batches may be missing")

    # Group by batch_id — skip jobs without one
    batch_map: dict[str, dict[str, Any]] = {}
    for row in cast("list[dict[str, Any]]", response.data or []):
        payload = row["payload"]
        created_at = row["created_at"]

        bid = payload.get("batch_id")
        if not bid:
            continue
        shop_ids = [s["shop_id"] for s in payload.get("shops", []) if s.get("shop_id")]

        if bid not in batch_map:
            batch_map[bid] = {"shop_ids": [], "created_at": created_at}
        else:
            if created_at < batch_map[bid]["created_at"]:
                batch_map[bid]["created_at"] = created_at
        # Dedup: retried batches produce a new job with the same shop_ids; extend without dupes
        existing = set(batch_map[bid]["shop_ids"])
        batch_map[bid]["shop_ids"].extend(s for s in shop_ids if s not in existing)

    sorted_batches = sorted(batch_map.items(), key=lambda x: x[1]["created_at"], reverse=True)
    total = len(sorted_batches)
    page_batches = sorted_batches[offset : offset + limit]

    # Batch-query shops for this page only
    all_shop_ids = [sid for _, b in page_batches for sid in b["shop_ids"]]
    shop_status_map: dict[str, str] = {}
    if all_shop_ids:
        shops_resp = (
            db.table("shops").select("id, processing_status").in_("id", all_shop_ids).execute()
        )
        for s in cast("list[dict[str, Any]]", shops_resp.data or []):
            shop_status_map[str(s["id"])] = s["processing_status"]

    batches = []
    for bid, b in page_batches:
        status_counts: dict[str, int] = {}
        for sid in b["shop_ids"]:
            status = shop_status_map.get(str(sid), "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        batches.append(
            {
                "batch_id": bid,
                "created_at": b["created_at"],
                "shop_count": len(b["shop_ids"]),
                "status_counts": status_counts,
            }
        )

    return {"batches": batches, "total": total}


def _collect_shop_ids_for_batch(batch_id: str, db: Any) -> list[str]:
    """Collect all shop IDs for a batch from the scrape_batch job."""
    batch_job_resp = (
        db.table("job_queue")
        .select("payload")
        .eq("job_type", JobType.SCRAPE_BATCH.value)
        .eq("payload->>batch_id", batch_id)
        .execute()
    )
    shop_ids: list[str] = []
    for row in cast("list[dict[str, Any]]", batch_job_resp.data or []):
        for s in row["payload"].get("shops", []):
            if s.get("shop_id"):
                shop_ids.append(s["shop_id"])

    return list(dict.fromkeys(shop_ids))  # dedup, preserve order


@router.get("/batches/{batch_id}")
async def get_batch_detail(
    batch_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Per-shop detail for a batch run with search, filter, and pagination.

    Returns status_summary with unfiltered counts for the summary bar.
    """
    db = get_service_role_client()

    shop_ids = _collect_shop_ids_for_batch(batch_id, db)
    if not shop_ids:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    # Single unfiltered fetch — status_summary needs all shops; search/status filtered in Python
    all_shops_resp = (
        db.table("shops").select("id, name, processing_status").in_("id", shop_ids).execute()
    )
    all_shop_rows: dict[str, dict[str, Any]] = {
        str(s["id"]): s for s in cast("list[dict[str, Any]]", all_shops_resp.data or [])
    }

    # Unfiltered status summary
    status_summary: dict[str, int] = {}
    for s in all_shop_rows.values():
        st = s["processing_status"]
        status_summary[st] = status_summary.get(st, 0) + 1

    # Collect errors for all shops in batch
    failed_resp = (
        db.table("job_queue")
        .select("payload, last_error, job_type")
        .eq("payload->>batch_id", batch_id)
        .in_("status", ["failed", "dead_letter"])
        .execute()
    )
    shop_errors: dict[str, dict[str, str]] = {}
    for row in cast("list[dict[str, Any]]", failed_resp.data or []):
        error = row.get("last_error")
        if not error:
            continue
        job_type = row["job_type"]
        row_payload = row["payload"]
        if job_type == JobType.SCRAPE_BATCH.value:
            # Batch-level failure — fan out error to each shop in the batch payload
            for shop_entry in row_payload.get("shops", []):
                sid = str(shop_entry.get("shop_id", ""))
                if sid:
                    shop_errors[sid] = {"last_error": error, "failed_at_stage": job_type}
        else:
            sid = str(row_payload.get("shop_id", ""))
            if sid:
                shop_errors[sid] = {"last_error": error, "failed_at_stage": job_type}

    # Build full shop list, applying search/status filters in Python, preserving original order
    search_lower = search.lower() if search else None
    all_shops = []
    for sid in shop_ids:
        shop_info = all_shop_rows.get(str(sid))
        if shop_info is None:
            continue
        shop_name = shop_info.get("name", "")
        shop_status = shop_info.get("processing_status", "unknown")
        if search_lower and search_lower not in shop_name.lower():
            continue
        if status and shop_status != status:
            continue
        error_info = shop_errors.get(str(sid), {})
        all_shops.append(
            {
                "shop_id": sid,
                "name": shop_name,
                "processing_status": shop_status,
                "last_error": error_info.get("last_error"),
                "failed_at_stage": error_info.get("failed_at_stage"),
            }
        )

    # Failed shops first, then alphabetical
    all_shops.sort(key=lambda x: (x["processing_status"] != "failed", x["name"] or ""))

    total_filtered = len(all_shops)
    page_shops = all_shops[offset : offset + limit]

    return {
        "batch_id": batch_id,
        "shops": page_shops,
        "total": total_filtered,
        "status_summary": status_summary,
    }


@router.get("/jobs")
async def list_jobs(
    status: str | None = None,
    job_type: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """List all jobs with optional filters."""
    db = get_service_role_client()
    query = db.table("job_queue").select("*", count="exact")
    if status:
        query = query.eq("status", status)
    if job_type:
        query = query.eq("job_type", job_type)
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = query.execute()
    return {
        "jobs": cast("list[dict[str, Any]]", response.data),
        "total": response.count or 0,
    }


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Cancel a pending or claimed job."""
    db = get_service_role_client()

    job_response = db.table("job_queue").select("id, status").eq("id", job_id).execute()
    if not job_response.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job_status = first(cast("list[dict[str, Any]]", job_response.data), "fetch job")["status"]
    if job_status not in ("pending", "claimed"):
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} cannot be cancelled (status: {job_status})",
        )

    # Conditional update: only succeeds if job is still in a cancellable state
    update_response = (
        db.table("job_queue")
        .update({"status": "dead_letter", "last_error": "Cancelled by admin"})
        .eq("id", job_id)
        .in_("status", ["pending", "claimed"])
        .execute()
    )
    if not update_response.data:
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} could not be cancelled — it may have already completed",
        )

    log_admin_action(
        admin_user_id=user["id"],
        action=f"POST /admin/pipeline/jobs/{job_id}/cancel",
        target_type="job",
        target_id=job_id,
    )
    return {"message": f"Job {job_id} cancelled"}


async def _run_pipeline_safe() -> None:
    with contextlib.suppress(SystemExit):
        from scripts.run_pipeline_batch import main as _run_pipeline

        await _run_pipeline(dry_run=False)


@router.post("/run-batch", status_code=202)
async def run_pipeline_batch(
    background_tasks: BackgroundTasks,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Queue a full pipeline batch run in the background."""
    background_tasks.add_task(_run_pipeline_safe)
    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/pipeline/run-batch",
        target_type="pipeline",
    )
    return {"message": "Pipeline batch run queued"}
