import asyncio
from typing import Any

from fastapi import APIRouter, Depends
from supabase import Client

from api.deps import get_current_user, get_user_db
from core.db import first

router = APIRouter(prefix="/stamps", tags=["stamps"])


@router.get("/")
async def get_my_stamps(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> list[dict[str, Any]]:
    """Get current user's stamps with shop names and photos. Auth required."""
    response = await asyncio.to_thread(
        lambda: (
            db.table("stamps")
            .select(
                "id, user_id, shop_id, check_in_id, design_url, earned_at,"
                " shops(name), check_ins(photo_urls, note)"
            )
            .eq("user_id", user["id"])
            .order("earned_at", desc=True)
            .execute()
        )
    )
    results = []
    for row in response.data:
        shop_data = row.pop("shops", {}) or {}
        checkin_data = row.pop("check_ins", {}) or {}
        row["shop_name"] = shop_data.get("name")
        photo_urls = checkin_data.get("photo_urls") or []
        row["photo_url"] = first(photo_urls, "stamp photo_url") if photo_urls else None
        row["diary_note"] = checkin_data.get("note")
        results.append(row)
    return results
