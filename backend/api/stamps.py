from typing import Any

from fastapi import APIRouter, Depends
from supabase import Client

from api.deps import get_current_user, get_user_db

router = APIRouter(prefix="/stamps", tags=["stamps"])


@router.get("/")
async def get_my_stamps(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> list[Any]:
    """Get current user's stamps. Auth required."""
    response = (
        db.table("stamps")
        .select("*")
        .eq("user_id", user["id"])
        .order("earned_at", desc=True)
        .execute()
    )
    return response.data
