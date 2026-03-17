from typing import Any

from fastapi import APIRouter, Query

from db.supabase_client import get_anon_client
from services.tarot_service import TarotService
from services.vibe_service import VibeService

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
    cards = await service.draw(lat=lat, lng=lng, radius_km=radius_km, excluded_ids=parsed_excluded)
    return [c.model_dump(by_alias=True) for c in cards]


@router.get("/vibes")
def list_vibes() -> list[dict[str, object]]:
    """Return all active vibe collections. Public — no auth required."""
    db = get_anon_client()
    service = VibeService(db)
    vibes = service.get_vibes()
    return [v.model_dump(by_alias=True) for v in vibes]


@router.get("/vibes/{slug}/shops")
def vibe_shops(
    slug: str,
    lat: float | None = Query(default=None, ge=-90.0, le=90.0),
    lng: float | None = Query(default=None, ge=-180.0, le=180.0),
    radius_km: float = Query(default=5.0, ge=0.5, le=20.0),
) -> dict[str, object]:
    """Return shops matching a vibe, ranked by tag overlap. Public — no auth required."""
    db = get_anon_client()
    service = VibeService(db)
    result = service.get_shops_for_vibe(slug=slug, lat=lat, lng=lng, radius_km=radius_km)
    return result.model_dump(by_alias=True)
