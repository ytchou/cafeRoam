import contextlib
from datetime import UTC, datetime
from typing import Any, Literal, cast

import structlog
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query
from pydantic import BaseModel

from api.deps import require_admin
from core.db import first
from db.supabase_client import get_service_role_client
from middleware.admin_audit import log_admin_action

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

    # Filter to submissions in approvable states
    valid_subs = [
        sub
        for sid in body.submission_ids
        if (sub := subs_by_id.get(sid))
        and sub["status"] in ("pending", "processing", "pending_review")
    ]
    skipped = len(body.submission_ids) - len(valid_subs)

    if not valid_subs:
        log_admin_action(
            admin_user_id=user["id"],
            action="POST /admin/pipeline/approve-bulk",
            target_type="submission",
            payload={"approved": 0, "skipped": skipped},
        )
        return {"approved": 0, "skipped": skipped, "failed": failed}

    valid_ids = [sub["id"] for sub in valid_subs]

    # Bulk UPDATE shop_submissions — .select("id") required so supabase-py returns updated rows
    updated_res = (
        db.table("shop_submissions")
        .update({"status": "live", "reviewed_at": now})
        .in_("id", valid_ids)
        .in_("status", ["pending", "processing", "pending_review"])
        .select("id")
        .execute()
    )
    updated_ids = {row["id"] for row in cast("list[dict[str, Any]]", updated_res.data or [])}
    updated_subs = [sub for sub in valid_subs if sub["id"] in updated_ids]
    updated_shop_ids = [sub["shop_id"] for sub in updated_subs]
    approved = len(updated_ids)
    skipped = len(body.submission_ids) - approved

    # Bulk UPDATE shops — fetch names in the same round-trip via .select("id, name")
    shop_name_by_id: dict[str, str] = {}
    if updated_shop_ids:
        shop_update = (
            db.table("shops")
            .update({"processing_status": "live", "updated_at": now})
            .in_("id", updated_shop_ids)
            .select("id, name")
            .execute()
        )
        shop_name_by_id = {
            row["id"]: row.get("name", "Unknown")
            for row in cast("list[dict[str, Any]]", shop_update.data or [])
        }

    # Batch INSERT activity_feed for user-submitted shops in one call
    activity_rows = [
        {
            "event_type": "shop_added",
            "actor_id": sub["submitted_by"],
            "shop_id": sub["shop_id"],
            "metadata": {"shop_name": shop_name_by_id.get(sub["shop_id"], "Unknown")},
        }
        for sub in updated_subs
        if sub.get("submitted_by")
    ]
    if activity_rows:
        db.table("activity_feed").insert(activity_rows).execute()

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

    # Filter to submissions in rejectable states (exclude already live/rejected)
    valid_subs = [
        sub
        for sid in body.submission_ids
        if (sub := subs_by_id.get(sid)) and sub["status"] not in ("live", "rejected")
    ]
    skipped = len(body.submission_ids) - len(valid_subs)

    if not valid_subs:
        log_admin_action(
            admin_user_id=user["id"],
            action="POST /admin/pipeline/reject-bulk",
            target_type="submission",
            payload={"rejected": 0, "skipped": skipped, "reason": body.rejection_reason},
        )
        return {"rejected": 0, "skipped": skipped}

    valid_ids = [sub["id"] for sub in valid_subs]

    # Bulk UPDATE shop_submissions — .select("id") required so supabase-py returns updated rows
    updated_res = (
        db.table("shop_submissions")
        .update(
            {
                "status": "rejected",
                "rejection_reason": body.rejection_reason,
                "reviewed_at": now,
            }
        )
        .in_("id", valid_ids)
        .not_.in_("status", ["live", "rejected"])
        .select("id")
        .execute()
    )
    updated_ids = {row["id"] for row in cast("list[dict[str, Any]]", updated_res.data or [])}
    updated_subs = [sub for sub in valid_subs if sub["id"] in updated_ids]
    updated_shop_ids = [sub["shop_id"] for sub in updated_subs]
    rejected = len(updated_ids)
    skipped = len(body.submission_ids) - rejected

    # Bulk UPDATE shops processing_status
    if updated_shop_ids:
        db.table("shops").update({"processing_status": "rejected"}).in_(
            "id", updated_shop_ids
        ).execute()

    # cancel_shop_jobs RPC — no bulk variant exists, call per shop
    for sub in updated_subs:
        db.rpc(
            "cancel_shop_jobs",
            {"p_shop_id": sub["shop_id"], "p_reason": body.rejection_reason},
        ).execute()

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
    """List batch runs with per-status shop counts from batch_run_shops."""
    db = get_service_role_client()

    response = (
        db.table("batch_runs")
        .select("id, batch_id, started_at, completed_at, status, total", count="exact")
        .order("started_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    total = response.count or 0

    batch_run_ids = [str(b["id"]) for b in cast("list[dict[str, Any]]", response.data or [])]
    status_counts_by_batch: dict[str, dict[str, int]] = {}
    if batch_run_ids:
        shops_resp = (
            db.table("batch_run_shops")
            .select("batch_run_id, status")
            .in_("batch_run_id", batch_run_ids)
            .execute()
        )
        for row in cast("list[dict[str, Any]]", shops_resp.data or []):
            bid = str(row["batch_run_id"])
            st = row["status"]
            counts = status_counts_by_batch.setdefault(bid, {})
            counts[st] = counts.get(st, 0) + 1

    batches = [
        {
            "batch_id": b["batch_id"],
            "started_at": b["started_at"],
            "completed_at": b["completed_at"],
            "status": b["status"],
            "shop_count": b["total"] or 0,
            "status_counts": status_counts_by_batch.get(str(b["id"]), {}),
        }
        for b in cast("list[dict[str, Any]]", response.data or [])
    ]

    return {"batches": batches, "total": total}


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

    batch_resp = db.table("batch_runs").select("id").eq("batch_id", batch_id).limit(1).execute()
    if not batch_resp.data:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    batch_run_id = str(first(batch_resp.data, "batch_runs lookup")["id"])

    all_resp = (
        db.table("batch_run_shops")
        .select("shop_id, shop_name, status, error_message")
        .eq("batch_run_id", batch_run_id)
        .execute()
    )
    all_shops_raw = cast("list[dict[str, Any]]", all_resp.data or [])

    # Unfiltered status summary
    status_summary: dict[str, int] = {}
    for s in all_shops_raw:
        st = s["status"]
        status_summary[st] = status_summary.get(st, 0) + 1

    # Apply search/status filters in Python
    search_lower = search.lower() if search else None
    all_shops = []
    for s in all_shops_raw:
        shop_name = s.get("shop_name") or ""
        shop_status = s.get("status", "unknown")
        if search_lower and search_lower not in shop_name.lower():
            continue
        if status and shop_status != status:
            continue
        all_shops.append(
            {
                "shop_id": str(s["shop_id"]),
                "name": shop_name,
                "processing_status": shop_status,
                "last_error": s.get("error_message"),
                "failed_at_stage": None,
            }
        )

    # Errors first, then alphabetical
    all_shops.sort(key=lambda x: (x["processing_status"] != "error", x["name"]))

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


class CancelJobRequest(BaseModel):
    reason: str | None = None


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    body: CancelJobRequest = Body(default_factory=CancelJobRequest),  # noqa: B008
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Cancel a pending or claimed job."""
    from workers.job_log import log_job_event

    db = get_service_role_client()
    effective_reason = body.reason or "Cancelled by admin"

    job_response = db.table("job_queue").select("id, status, payload").eq("id", job_id).execute()
    if not job_response.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job = first(cast("list[dict[str, Any]]", job_response.data), "fetch job")
    job_status = job["status"]
    if job_status not in ("pending", "claimed"):
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} cannot be cancelled (status: {job_status})",
        )

    # Conditional update: only succeeds if job is still in a cancellable state
    update_response = (
        db.table("job_queue")
        .update({
            "status": "cancelled",
            "cancelled_at": datetime.now(UTC).isoformat(),
            "cancel_reason": effective_reason,
        })
        .eq("id", job_id)
        .in_("status", ["pending", "claimed"])
        .execute()
    )
    if not update_response.data:
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} could not be cancelled — it may have already completed",
        )

    # Update shop processing_status if job had a shop_id and shop is not already live/failed
    payload = job.get("payload") or {}
    shop_id = payload.get("shop_id")
    if shop_id:
        (
            db.table("shops")
            .update({"processing_status": "failed", "rejection_reason": effective_reason})
            .eq("id", shop_id)
            .not_.in_("processing_status", ["live", "failed"])
            .execute()
        )

    # Insert a job_logs warn row
    await log_job_event(db, job_id, "warn", "job.cancelled", reason=effective_reason)

    log_admin_action(
        admin_user_id=user["id"],
        action=f"POST /admin/pipeline/jobs/{job_id}/cancel",
        target_type="job",
        target_id=job_id,
    )
    return {"message": f"Job {job_id} cancelled"}


@router.get("/jobs/{job_id}/logs")
async def get_job_logs(
    job_id: str,
    after_ts: str | None = None,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Fetch structured logs for a specific job.

    Capped at 500 rows; supports incremental polling via after_ts.
    """
    db = get_service_role_client()

    job_result = db.table("job_queue").select("status").eq("id", job_id).execute()
    if not job_result.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    job = first(cast("list[dict[str, Any]]", job_result.data), "job_queue lookup")

    if after_ts:
        try:
            datetime.fromisoformat(after_ts)
        except ValueError:
            raise HTTPException(status_code=422, detail="after_ts must be a valid ISO-8601 datetime")

    query = (
        db.table("job_logs")
        .select("id, level, message, context, created_at")
        .eq("job_id", job_id)
        .order("created_at", desc=False)
        .limit(500)
    )
    if after_ts:
        query = query.gt("created_at", after_ts)

    logs_result = query.execute()

    return {
        "logs": logs_result.data or [],
        "job_status": job["status"],
    }


class RunBatchRequest(BaseModel):
    shop_ids: list[str] | None = None


async def _run_pipeline_safe(shop_ids: list[str] | None = None) -> None:
    with contextlib.suppress(SystemExit):
        from scripts.run_pipeline_batch import main as _run_pipeline

        await _run_pipeline(dry_run=False, shop_ids=shop_ids)


@router.post("/run-batch", status_code=202)
async def run_pipeline_batch(
    background_tasks: BackgroundTasks,
    body: RunBatchRequest = Body(default_factory=RunBatchRequest),  # noqa: B008
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Queue a pipeline batch run in the background.

    Pass shop_ids to run only for specific shops; omit to run for all pending shops.
    """
    background_tasks.add_task(_run_pipeline_safe, body.shop_ids)
    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/pipeline/run-batch",
        target_type="pipeline",
        payload={"shop_ids": body.shop_ids},
    )
    return {"message": "Pipeline batch run queued"}
