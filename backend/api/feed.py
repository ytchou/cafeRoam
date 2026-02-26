from typing import Any, cast

from fastapi import APIRouter, Query

from db.supabase_client import get_service_role_client

router = APIRouter(tags=["feed"])


@router.get("/feed")
async def activity_feed(
    limit: int = Query(20, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Public activity feed — recent community events."""
    # Use service-role client: RLS blocks anon access to prevent actor_id
    # exposure via direct PostgREST queries. The API controls which columns
    # are returned — actor_id is intentionally excluded from the select.
    db = get_service_role_client()
    response = (
        db.table("activity_feed")
        .select("id, event_type, shop_id, metadata, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return cast("list[dict[str, Any]]", response.data)
