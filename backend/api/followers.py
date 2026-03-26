"""API routes for shop follow/unfollow and follower counts."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from api.deps import get_admin_db, get_current_user, get_optional_user, get_user_db
from services.follower_service import FollowerService

router = APIRouter(tags=["followers"])


@router.post("/shops/{shop_id}/follow")
async def follow_shop(
    shop_id: str,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Follow a shop. Auth required. Idempotent."""
    service = FollowerService(db=db)
    try:
        result = service.follow(user_id=user["id"], shop_id=shop_id)
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None


@router.delete("/shops/{shop_id}/follow")
async def unfollow_shop(
    shop_id: str,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Unfollow a shop. Auth required. Idempotent."""
    service = FollowerService(db=db)
    result = service.unfollow(user_id=user["id"], shop_id=shop_id)
    return result.model_dump(by_alias=True)


@router.get("/shops/{shop_id}/followers/count")
async def get_follower_count(
    shop_id: str,
    user: dict[str, Any] | None = Depends(get_optional_user),  # noqa: B008
    db: Client = Depends(get_admin_db),  # noqa: B008
) -> dict[str, Any]:
    """Get follower count for a shop. Auth optional.

    Uses get_admin_db (service-role client) because get_user_db requires a
    Bearer token and this endpoint must be accessible to unauthenticated users.
    The service layer enforces read-only access to the follower count.
    """
    service = FollowerService(db=db)
    user_id = user["id"] if user else None
    result = service.get_follower_count(shop_id=shop_id, user_id=user_id)
    return result.model_dump(by_alias=True)


@router.get("/me/following")
async def get_my_following(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Get shops the current user follows. Auth required. Paginated."""
    service = FollowerService(db=db)
    result = service.get_following(user_id=user["id"], page=page, limit=limit)
    return result.model_dump(by_alias=True)
