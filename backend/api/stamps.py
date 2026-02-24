from fastapi import APIRouter, Depends

from api.deps import get_current_user
from db.supabase_client import get_supabase_client

router = APIRouter(prefix="/stamps", tags=["stamps"])


@router.get("/")
async def get_my_stamps(user: dict = Depends(get_current_user)):  # noqa: B008
    """Get current user's stamps. Auth required."""
    db = get_supabase_client()
    response = (
        db.table("stamps")
        .select("*")
        .eq("user_id", user["id"])
        .order("earned_at", desc=True)
        .execute()
    )
    return response.data
