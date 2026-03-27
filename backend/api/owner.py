from fastapi import APIRouter, Depends, Query
from supabase import Client

from api.deps import get_admin_db, require_shop_owner
from models.owner import OwnerStoryIn, OwnerTagsIn, ReviewResponseIn, ShopInfoIn
from providers.analytics import get_analytics_provider
from providers.analytics.interface import AnalyticsProvider
from services.owner_service import OwnerService

router = APIRouter(prefix="/owner", tags=["owner"])


def get_owner_service(
    db: Client = Depends(get_admin_db),
    analytics: AnalyticsProvider = Depends(get_analytics_provider),
) -> OwnerService:
    return OwnerService(db=db, analytics=analytics)


@router.get("/{shop_id}/dashboard")
async def get_dashboard(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Return 30-day KPI stats for the owner's shop dashboard."""
    return svc.get_dashboard_stats(shop_id).model_dump()


@router.get("/{shop_id}/analytics")
async def get_analytics(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Return search insights, community pulse tags, and district rankings."""
    return {
        "search_insights": [i.model_dump() for i in svc.get_search_insights(shop_id)],
        "community_pulse": [p.model_dump() for p in svc.get_community_pulse(shop_id)],
        "district_rankings": [r.model_dump() for r in svc.get_ranking(shop_id)],
    }


@router.get("/{shop_id}/story")
async def get_story(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Return the owner's published shop story, or null if none exists."""
    story = svc.get_shop_story(shop_id)
    return story.model_dump() if story else None


@router.put("/{shop_id}/story")
async def upsert_story(
    shop_id: str,
    body: OwnerStoryIn,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Create or replace the owner's shop story."""
    return svc.upsert_shop_story(shop_id, user["id"], body).model_dump()


@router.patch("/{shop_id}/info")
async def update_info(
    shop_id: str,
    body: ShopInfoIn,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Patch mutable shop info fields (description, hours, phone, website)."""
    return svc.update_shop_info(shop_id, user["id"], body)


@router.get("/{shop_id}/tags")
async def get_tags(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Return the current owner-managed tags for the shop."""
    return {"tags": svc.get_owner_tags(shop_id)}


@router.put("/{shop_id}/tags")
async def update_tags(
    shop_id: str,
    body: OwnerTagsIn,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Replace owner-managed tags for the shop."""
    return {"tags": svc.update_owner_tags(shop_id, user["id"], body.tags)}


@router.get("/{shop_id}/reviews")
async def get_reviews(
    shop_id: str,
    page: int = Query(default=1, ge=1),
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Return paginated check-in reviews for the shop."""
    return {"reviews": svc.get_reviews(shop_id, page=page)}


@router.post("/{shop_id}/reviews/{checkin_id}/response")
async def upsert_response(
    shop_id: str,
    checkin_id: str,
    body: ReviewResponseIn,
    user: dict = Depends(require_shop_owner),
    svc: OwnerService = Depends(get_owner_service),
):
    """Create or replace the owner's reply to a specific check-in review."""
    return svc.upsert_review_response(
        checkin_id=checkin_id,
        shop_id=shop_id,
        owner_id=user["id"],
        body=body.body,
    ).model_dump()
