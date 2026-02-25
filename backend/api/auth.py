from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from api.deps import get_current_user, get_user_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/consent")
async def record_consent(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Record PDPA consent. Idempotent: re-posting does not change existing timestamp."""
    response = (
        db.table("profiles").update({"pdpa_consent_at": "now()"}).eq("id", user["id"]).execute()
    )
    return response.data[0]


@router.delete("/account")
async def delete_account(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Request account deletion. Sets deletion_requested_at timestamp.

    A background scheduler will hard-delete the account after the grace period.
    """
    response = (
        db.table("profiles")
        .update({"deletion_requested_at": "now()"})
        .eq("id", user["id"])
        .execute()
    )
    return response.data[0]


@router.post("/cancel-deletion")
async def cancel_deletion(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Cancel a pending account deletion. Returns 404 if no deletion is pending."""
    profile = (
        db.table("profiles")
        .select("id, deletion_requested_at")
        .eq("id", user["id"])
        .single()
        .execute()
    )
    # .single() returns data as a dict (not a list)
    if not profile.data or profile.data.get("deletion_requested_at") is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account deletion is not pending",
        )
    response = (
        db.table("profiles").update({"deletion_requested_at": None}).eq("id", user["id"]).execute()
    )
    return response.data[0]
