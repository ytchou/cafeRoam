from typing import Any, Literal, cast

from fastapi import APIRouter, HTTPException, Query
from starlette.requests import Request

from core.config import settings
from middleware.rate_limit import limiter
from providers.maps import get_maps_provider

router = APIRouter(prefix="/maps", tags=["maps"])

VALID_PROFILES = {"walking", "driving-traffic"}


@limiter.limit(settings.rate_limit_maps_directions)
@router.get("/directions")
async def get_directions(
    request: Request,
    origin_lat: float = Query(..., ge=-90.0, le=90.0),
    origin_lng: float = Query(..., ge=-180.0, le=180.0),
    dest_lat: float = Query(..., ge=-90.0, le=90.0),
    dest_lng: float = Query(..., ge=-180.0, le=180.0),
    profile: str = Query(...),
) -> dict[str, Any]:
    """Get walking or driving directions between two points. Public — no auth required."""
    if profile not in VALID_PROFILES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid profile: {profile}. "
            f"Must be one of: {', '.join(sorted(VALID_PROFILES))}",
        )

    provider = get_maps_provider()
    try:
        result = await provider.get_directions(
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
            profile=cast("Literal['walking', 'driving-traffic']", profile),
        )
        if result is None:
            raise HTTPException(status_code=502, detail="Upstream directions service unavailable")
        return result.model_dump(by_alias=True)
    finally:
        await provider.close()
