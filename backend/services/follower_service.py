"""Service for shop follow/unfollow operations and follower count queries."""

from typing import Any, cast

from postgrest.exceptions import APIError
from supabase import Client

from models.types import (
    FollowedShopSummary,
    FollowerCountResponse,
    FollowingListResponse,
    FollowResponse,
)

FOLLOWER_VISIBILITY_THRESHOLD = 10


class FollowerService:
    def __init__(self, db: Client) -> None:
        self._db = db

    def follow(self, *, user_id: str, shop_id: str) -> FollowResponse:
        """Follow a shop. Idempotent — duplicate follows return success."""
        try:
            self._db.table("shop_followers").insert(
                {"user_id": user_id, "shop_id": shop_id}
            ).execute()
        except APIError as e:
            code = getattr(e, "code", "") or ""
            if code == "23505":
                pass
            elif code == "23503":
                raise ValueError(f"Shop not found: {shop_id}") from e
            else:
                raise

        count = self._get_count(shop_id)
        return FollowResponse(
            following=True,
            follower_count=count,
            visible=count >= FOLLOWER_VISIBILITY_THRESHOLD,
        )

    def unfollow(self, *, user_id: str, shop_id: str) -> FollowResponse:
        """Unfollow a shop. Idempotent — unfollowing when not following returns success."""
        self._db.table("shop_followers").delete().eq("user_id", user_id).eq(
            "shop_id", shop_id
        ).execute()

        count = self._get_count(shop_id)
        return FollowResponse(
            following=False,
            follower_count=count,
            visible=count >= FOLLOWER_VISIBILITY_THRESHOLD,
        )

    def get_follower_count(self, *, shop_id: str, user_id: str | None) -> FollowerCountResponse:
        """Get follower count with visibility threshold and optional is_following check."""
        count = self._get_count(shop_id)
        visible = count >= FOLLOWER_VISIBILITY_THRESHOLD

        is_following: bool | None = None
        if user_id:
            row = (
                self._db.table("shop_followers")
                .select("id")
                .eq("user_id", user_id)
                .eq("shop_id", shop_id)
                .maybe_single()
                .execute()
            )
            is_following = row is not None and row.data is not None

        return FollowerCountResponse(count=count, visible=visible, is_following=is_following)

    def get_following(
        self, *, user_id: str, page: int = 1, limit: int = 20
    ) -> FollowingListResponse:
        """Get paginated list of shops the user follows."""
        offset = (page - 1) * limit

        rows_resp = (
            self._db.table("shop_followers")
            .select("created_at, shops(id, name, address, slug, mrt, primary_tag)", count="exact")  # type: ignore[arg-type]
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", rows_resp.data or [])
        total = rows_resp.count if rows_resp.count is not None else len(rows)

        shops = []
        for row in rows:
            shop_data = row.get("shops", {})
            if shop_data:
                shops.append(
                    FollowedShopSummary(
                        id=shop_data["id"],
                        name=shop_data["name"],
                        address=shop_data["address"],
                        slug=shop_data.get("slug"),
                        mrt=shop_data.get("mrt"),
                        primary_tag=shop_data.get("primary_tag"),
                        followed_at=row["created_at"],
                    )
                )

        return FollowingListResponse(
            shops=shops,
            total=total,
            page=page,
            limit=limit,
            has_more=total > offset + len(shops),
        )

    def _get_count(self, shop_id: str) -> int:
        """Get raw follower count for a shop."""
        resp = (
            self._db.table("shop_followers")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("shop_id", shop_id)
            .execute()
        )
        if resp.count is not None:
            return resp.count
        return len(resp.data or [])
