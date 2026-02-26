from typing import Any, cast

import structlog
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from core.config import settings
from db.supabase_client import get_service_role_client
from models.types import JobStatus

logger = structlog.get_logger()

router = APIRouter(prefix="/admin/pipeline", tags=["admin"])


def _require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:  # noqa: B008
    user_id = user["id"]
    if user_id not in settings.admin_user_ids:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/overview")
async def pipeline_overview(
    user: dict[str, Any] = Depends(_require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Job counts by status, recent submissions."""
    db = get_service_role_client()

    # Count jobs by status
    job_counts: dict[str, int] = {}
    for status in JobStatus:
        response = (
            db.table("job_queue").select("id", count="exact").eq("status", status.value).execute()  # type: ignore[arg-type]
        )
        job_counts[status.value] = response.count or 0

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
    user: dict[str, Any] = Depends(_require_admin),  # noqa: B008
) -> list[dict[str, Any]]:
    """List shop submissions, optionally filtered by status."""
    db = get_service_role_client()
    query = db.table("shop_submissions").select("*").order("created_at", desc=True).limit(50)
    if status:
        query = query.eq("status", status)
    response = query.execute()
    return cast("list[dict[str, Any]]", response.data)


@router.get("/dead-letter")
async def dead_letter_jobs(
    user: dict[str, Any] = Depends(_require_admin),  # noqa: B008
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
    user: dict[str, Any] = Depends(_require_admin),  # noqa: B008
) -> dict[str, str]:
    """Manually retry a failed/dead-letter job."""
    db = get_service_role_client()

    job_response = db.table("job_queue").select("id, status").eq("id", job_id).execute()
    if not job_response.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job_status = cast("list[dict[str, Any]]", job_response.data)[0]["status"]
    if job_status not in ("failed", "dead_letter"):
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} is not retryable (status: {job_status})",
        )

    db.table("job_queue").update({"status": "pending", "attempts": 0, "last_error": None}).eq(
        "id", job_id
    ).execute()
    return {"message": f"Job {job_id} re-queued"}


@router.post("/reject/{submission_id}")
async def reject_submission(
    submission_id: str,
    user: dict[str, Any] = Depends(_require_admin),  # noqa: B008
) -> dict[str, str]:
    """Reject a submission and remove the associated shop."""
    db = get_service_role_client()

    sub_response = (
        db.table("shop_submissions").select("shop_id").eq("id", submission_id).single().execute()
    )
    sub_data = cast("dict[str, Any]", sub_response.data)
    shop_id = sub_data.get("shop_id")

    db.table("shop_submissions").update(
        {"status": "failed", "failure_reason": "Rejected by admin"}
    ).eq("id", submission_id).execute()

    if shop_id:
        # Cancel in-flight jobs for this shop (JSONB payload filter)
        db.rpc(
            "cancel_shop_jobs",
            {"p_shop_id": str(shop_id), "p_reason": "Submission rejected by admin"},
        ).execute()
        db.table("shops").delete().eq("id", shop_id).execute()

    return {"message": f"Submission {submission_id} rejected"}
