from fastapi import APIRouter, Depends, Query
from supabase import Client

from api.deps import get_admin_db, get_current_user, require_shop_owner
from models.owner import OwnerStoryIn, OwnerTagsIn, ReviewResponseIn, ShopInfoIn
from services.owner_service import OwnerService

router = APIRouter(prefix="/owner", tags=["owner"])


@router.get("/{shop_id}/dashboard")
async def get_dashboard(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Return 30-day KPI stats for the owner's shop dashboard."""
    return OwnerService(db=db).get_dashboard_stats(shop_id).model_dump()


@router.get("/{shop_id}/analytics")
async def get_analytics(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Return search insights, community pulse tags, and district rankings."""
    svc = OwnerService(db=db)
    return {
        "search_insights": [i.model_dump() for i in svc.get_search_insights(shop_id)],
        "community_pulse": [p.model_dump() for p in svc.get_community_pulse(shop_id)],
        "district_rankings": [r.model_dump() for r in svc.get_ranking(shop_id)],
    }


@router.get("/{shop_id}/story")
async def get_story(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Return the owner's published shop story, or null if none exists."""
    story = OwnerService(db=db).get_shop_story(shop_id)
    return story.model_dump() if story else None


@router.put("/{shop_id}/story")
async def upsert_story(
    shop_id: str,
    body: OwnerStoryIn,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Create or replace the owner's shop story."""
    return OwnerService(db=db).upsert_shop_story(shop_id, user["id"], body).model_dump()


@router.patch("/{shop_id}/info")
async def update_info(
    shop_id: str,
    body: ShopInfoIn,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Patch mutable shop info fields (description, hours, phone, website)."""
    return OwnerService(db=db).update_shop_info(shop_id, user["id"], body)


@router.get("/{shop_id}/tags")
async def get_tags(
    shop_id: str,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Return the current owner-managed tags for the shop."""
    return {"tags": OwnerService(db=db).get_owner_tags(shop_id)}


@router.put("/{shop_id}/tags")
async def update_tags(
    shop_id: str,
    body: OwnerTagsIn,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Replace owner-managed tags for the shop."""
    return {"tags": OwnerService(db=db).update_owner_tags(shop_id, user["id"], body.tags)}


@router.get("/{shop_id}/reviews")
async def get_reviews(
    shop_id: str,
    page: int = Query(default=1, ge=1),
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Return paginated check-in reviews for the shop."""
    return {"reviews": OwnerService(db=db).get_reviews(shop_id, page=page)}


@router.post("/{shop_id}/reviews/{checkin_id}/response")
async def upsert_response(
    shop_id: str,
    checkin_id: str,
    body: ReviewResponseIn,
    user: dict = Depends(require_shop_owner),
    db: Client = Depends(get_admin_db),
):
    """Create or replace the owner's reply to a specific check-in review."""
    return OwnerService(db=db).upsert_review_response(
        checkin_id=checkin_id,
        shop_id=shop_id,
        owner_id=user["id"],
        body=body.body,
    ).model_dump()
