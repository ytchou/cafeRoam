import asyncio
from typing import Any

from fastapi import APIRouter, Depends
from supabase import Client

from api.deps import get_current_user, get_user_db

router = APIRouter(prefix="/stamps", tags=["stamps"])


@router.get("/")
async def get_my_stamps(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> list[dict[str, Any]]:
    """Get current user's stamps with shop names, photos, and district. Auth required."""
    response = await asyncio.to_thread(
        lambda: (
            db.table("stamps")
            .select("*, shops(name, district), check_ins(photo_urls, diary_note)")
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
        row["district"] = shop_data.get("district")
        photo_urls = checkin_data.get("photo_urls") or []
        row["photo_url"] = photo_urls[0] if photo_urls else None
        row["diary_note"] = checkin_data.get("diary_note")
        results.append(row)
    return results
