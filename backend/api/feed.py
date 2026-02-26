from typing import Any, cast

from fastapi import APIRouter, Query

from db.supabase_client import get_anon_client

router = APIRouter(tags=["feed"])


@router.get("/feed")
async def activity_feed(
    limit: int = Query(20, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Public activity feed — recent community events."""
    db = get_anon_client()
    response = (
        db.table("activity_feed")
        .select("id, event_type, shop_id, metadata, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return cast("list[dict[str, Any]]", response.data)
