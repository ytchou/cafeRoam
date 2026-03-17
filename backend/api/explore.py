from typing import Any

from fastapi import APIRouter, Query

from db.supabase_client import get_anon_client
from services.tarot_service import TarotService

router = APIRouter(prefix="/explore", tags=["explore"])


@router.get("/tarot-draw")
async def tarot_draw(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(default=3.0, ge=0.5, le=20.0),
    excluded_ids: str = Query(default=""),
) -> list[dict[str, Any]]:
    """Draw 3 tarot cards from nearby open shops. Public — no auth required."""
    parsed_excluded = [s.strip() for s in excluded_ids.split(",") if s.strip()]
    db = get_anon_client()
    service = TarotService(db)
    cards = await service.draw(
        lat=lat, lng=lng, radius_km=radius_km, excluded_ids=parsed_excluded
    )
    return [c.model_dump(by_alias=True) for c in cards]
