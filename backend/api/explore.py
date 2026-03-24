from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from api.deps import get_current_user, get_user_db
from db.supabase_client import get_anon_client
from services.community_service import CommunityService
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
    try:
        result = service.get_shops_for_vibe(slug=slug, lat=lat, lng=lng, radius_km=radius_km)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return result.model_dump(by_alias=True)


@router.get("/community/preview")
def community_preview(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> list[dict[str, object]]:
    """Community preview — auth required."""
    service = CommunityService(db)
    cards = service.get_preview(limit=3)
    return [c.model_dump(by_alias=True) for c in cards]


@router.get("/community")
def community_feed(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    mrt: str | None = Query(default=None),
    vibe_tag: str | None = Query(default=None),
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, object]:
    """Paginated community feed — auth required."""
    service = CommunityService(db)
    result = service.get_feed(cursor=cursor, limit=limit, mrt=mrt, vibe_tag=vibe_tag)
    return result.model_dump(by_alias=True)


@router.post("/community/{checkin_id}/like")
def community_like_toggle(
    checkin_id: str,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, int]:
    """Toggle like on a community note. Auth required."""
    service = CommunityService(db)
    try:
        count = service.toggle_like(checkin_id, user["id"])
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")
    return {"likeCount": count}


@router.get("/community/{checkin_id}/like")
def community_like_check(
    checkin_id: str,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, bool]:
    """Check if current user has liked a note. Auth required."""
    service = CommunityService(db)
    liked = service.is_liked(checkin_id, user["id"])
    return {"liked": liked}
