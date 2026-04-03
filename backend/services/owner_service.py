from __future__ import annotations

import logging
import uuid
from collections import Counter
from datetime import UTC
from typing import TYPE_CHECKING, Any, cast

from core.db import first
from models.owner import (
    CommunityPulseTag,
    DashboardStats,
    DistrictRanking,
    OwnerStoryIn,
    OwnerStoryOut,
    ReviewResponseOut,
    SearchInsight,
    ShopInfoIn,
)

if TYPE_CHECKING:
    from supabase import Client

    from providers.analytics.interface import AnalyticsProvider

logger = logging.getLogger(__name__)

# PDPA k-anonymity threshold (DEV-191).
# Demographic queries (age, gender, neighborhood) MUST NOT expose a slice
# when fewer than this many distinct users contribute to it. Pure aggregate
# counts (views, check-in totals) are exempt per PDPA Art. 5 purpose limitation.
K_ANONYMITY_THRESHOLD = 10


class OwnerService:
    def __init__(self, db: Client, analytics: AnalyticsProvider | None = None) -> None:
        self._db = db
        self._analytics = analytics

    # ── Stats ──────────────────────────────────────────────────────────────

    def get_dashboard_stats(self, shop_id: str) -> DashboardStats:
        """Aggregate check-ins, followers, saves, page views for last 30 days."""
        from concurrent.futures import ThreadPoolExecutor
        from datetime import datetime, timedelta

        cutoff = (datetime.now(UTC) - timedelta(days=30)).isoformat()

        def _count_checkins() -> int:
            return (
                self._db.table("check_ins")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("shop_id", shop_id)
                .gte("created_at", cutoff)
                .execute()
                .count
                or 0
            )

        def _count_followers() -> int:
            return (
                self._db.table("shop_followers")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("shop_id", shop_id)
                .execute()
                .count
                or 0
            )

        def _count_saves() -> int:
            return (
                self._db.table("list_items")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("shop_id", shop_id)
                .gte("created_at", cutoff)
                .execute()
                .count
                or 0
            )

        with ThreadPoolExecutor(max_workers=3) as executor:
            checkin_future = executor.submit(_count_checkins)
            follower_future = executor.submit(_count_followers)
            saves_future = executor.submit(_count_saves)
            checkin_count = checkin_future.result()
            follower_count = follower_future.result()
            saves_count = saves_future.result()

        try:
            page_views = self._get_page_views(shop_id)
        except Exception:
            logger.warning("PostHog page views unavailable for shop %s", shop_id)
            page_views = 0

        return DashboardStats(
            checkin_count_30d=checkin_count,
            follower_count=follower_count,
            saves_count_30d=saves_count,
            page_views_30d=page_views,
        )

    def _get_page_views(self, shop_id: str) -> int:
        try:
            uuid.UUID(shop_id)
        except ValueError:
            logger.warning("Invalid shop_id format: %s", shop_id)
            return 0
        if not self._analytics:
            return 0
        rows = self._analytics.query_hogql(
            f"SELECT count() as views FROM events "
            f"WHERE event = '$pageview' "
            f"AND properties.$current_url LIKE '%/shops/{shop_id}%' "
            f"AND timestamp >= now() - interval 30 day"
        )
        return int(rows[0]["views"]) if rows else 0

    # ── Analytics ──────────────────────────────────────────────────────────

    def get_search_insights(self, shop_id: str) -> list[SearchInsight]:
        try:
            uuid.UUID(shop_id)
        except ValueError:
            logger.warning("Invalid shop_id format: %s", shop_id)
            return []
        if not self._analytics:
            return []
        try:
            rows = self._analytics.query_hogql(
                f"SELECT properties.query as query, count() as impressions "
                f"FROM events "
                f"WHERE event = 'search_result_shown' "
                f"AND JSONExtractArrayRaw(properties.shop_ids, 0) LIKE '%{shop_id}%' "
                f"AND timestamp >= now() - interval 30 day "
                f"GROUP BY query ORDER BY impressions DESC LIMIT 10"
            )
        except Exception:
            logger.warning("PostHog search insights unavailable for shop %s", shop_id)
            return []
        return [SearchInsight(query=r["query"], impressions=int(r["impressions"])) for r in rows]

    def get_community_pulse(self, shop_id: str) -> list[CommunityPulseTag]:
        from datetime import datetime, timedelta

        cutoff = (datetime.now(UTC) - timedelta(days=30)).isoformat()

        result = (
            self._db.table("check_ins")
            .select("tags")
            .eq("shop_id", shop_id)
            .gte("created_at", cutoff)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", result.data or [])
        all_tags: list[str] = []
        for row in rows:
            all_tags.extend(row.get("tags") or [])

        counter = Counter(all_tags)
        return [CommunityPulseTag(tag=tag, count=count) for tag, count in counter.most_common(10)]

    def get_ranking(self, shop_id: str) -> list[DistrictRanking]:
        """Compute relative rank in district by top 3 attributes."""
        shop = (
            self._db.table("shops")
            .select("district, mode_work, mode_rest, mode_social")
            .eq("id", shop_id)
            .single()
            .execute()
        )
        if not shop.data:
            return []

        shop_data = cast("dict[str, Any]", shop.data)
        district = shop_data["district"]
        peers = (
            self._db.table("shops")
            .select("id, mode_work, mode_rest, mode_social")
            .eq("district", district)
            .execute()
        )
        peer_rows = cast("list[dict[str, Any]]", peers.data or [])
        attrs = ["mode_work", "mode_rest", "mode_social"]
        labels = {"mode_work": "工作", "mode_rest": "休息", "mode_social": "社交"}
        rankings = []
        for attr in attrs:
            scores: list[tuple[str, int]] = sorted(
                [(r["id"], r.get(attr) or 0) for r in peer_rows],
                key=lambda x: x[1],
                reverse=True,
            )
            rank = next((i + 1 for i, (sid, _) in enumerate(scores) if sid == shop_id), None)
            if rank:
                rankings.append(
                    DistrictRanking(
                        attribute=labels[attr],
                        rank=rank,
                        total_in_district=len(scores),
                    )
                )
        return sorted(rankings, key=lambda r: r.rank)[:3]

    # ── Analytics Terms ────────────────────────────────────────────────────

    def get_analytics_terms_status(self, shop_id: str, user_id: str) -> bool:
        """Return whether the owner has accepted the analytics data usage terms."""
        result = (
            self._db.table("shop_claims")
            .select("analytics_terms_accepted_at")
            .eq("shop_id", shop_id)
            .eq("user_id", user_id)
            .eq("status", "approved")
            .maybe_single()
            .execute()
        )
        data: dict[str, Any] | None = cast("dict[str, Any] | None", result.data if result else None)
        return bool(data and data.get("analytics_terms_accepted_at"))

    def accept_analytics_terms(self, shop_id: str, user_id: str) -> None:
        """Record that the owner accepted the analytics terms. Idempotent."""
        from datetime import datetime

        self._db.table("shop_claims").update(
            {"analytics_terms_accepted_at": datetime.now(UTC).isoformat()}
        ).eq("shop_id", shop_id).eq("user_id", user_id).eq("status", "approved").is_(
            "analytics_terms_accepted_at", "null"
        ).execute()

    # ── k-Anonymity ────────────────────────────────────────────────────────

    @staticmethod
    def suppress_demographic_slice(distinct_user_count: int) -> bool:
        """Return True if a demographic slice has enough contributors to be disclosed.

        Usage: call before returning any demographic breakdown (age, gender,
        neighborhood). If False, return None / "Not enough data" to the caller.
        Pure aggregate counts (views, check-in totals) are exempt.

        Example SQL pattern for demographic queries:
            SELECT age_group, COUNT(DISTINCT user_id) AS contributors, COUNT(*) AS events
            FROM ...
            GROUP BY age_group
            HAVING COUNT(DISTINCT user_id) >= 10  -- K_ANONYMITY_THRESHOLD
        """
        return distinct_user_count >= K_ANONYMITY_THRESHOLD

    # ── Shop Story ─────────────────────────────────────────────────────────

    def get_shop_story(self, shop_id: str) -> OwnerStoryOut | None:
        result = (
            self._db.table("shop_content")
            .select("id, shop_id, title, body, photo_url, is_published, created_at, updated_at")
            .eq("shop_id", shop_id)
            .eq("content_type", "story")
            .maybe_single()
            .execute()
        )
        if not result or not result.data:
            return None
        data = cast("dict[str, Any]", result.data)
        return OwnerStoryOut(**data)

    def upsert_shop_story(self, shop_id: str, owner_id: str, data: OwnerStoryIn) -> OwnerStoryOut:
        from datetime import datetime

        now = datetime.now(UTC).isoformat()
        row = {
            "shop_id": shop_id,
            "owner_id": owner_id,
            "content_type": "story",
            "title": data.title,
            "body": data.body,
            "photo_url": data.photo_url,
            "is_published": data.is_published,
            "updated_at": now,
        }
        result = (
            self._db.table("shop_content").upsert(row, on_conflict="shop_id,content_type").execute()
        )
        rows = cast("list[dict[str, Any]]", result.data)
        return OwnerStoryOut(**first(rows, "upsert shop_content"))

    # ── Shop Info ──────────────────────────────────────────────────────────

    def update_shop_info(self, shop_id: str, owner_id: str, data: ShopInfoIn) -> dict[str, Any]:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return {}
        result = self._db.table("shops").update(updates).eq("id", shop_id).execute()
        rows = cast("list[dict[str, Any]]", result.data)
        return first(rows, "update shop info")

    # ── Owner Tags ─────────────────────────────────────────────────────────

    def get_owner_tags(self, shop_id: str) -> list[str]:
        result = (
            self._db.table("shop_owner_tags")
            .select("tag")
            .eq("shop_id", shop_id)
            .order("created_at")
            .execute()
        )
        rows = cast("list[dict[str, Any]]", result.data or [])
        return [row["tag"] for row in rows]

    def update_owner_tags(self, shop_id: str, owner_id: str, tags: list[str]) -> list[str]:
        if len(tags) > 10:
            raise ValueError(f"Shop owners may set a maximum 10 tags; got {len(tags)}")

        if not tags:
            self._db.table("shop_owner_tags").delete().eq("shop_id", shop_id).execute()
            return []

        # Fetch existing tags to compute diff (avoids delete-all-then-insert data loss on failure)
        existing = set(self.get_owner_tags(shop_id))
        new_set = set(tags)

        to_add = new_set - existing
        to_remove = existing - new_set

        if to_remove:
            (
                self._db.table("shop_owner_tags")
                .delete()
                .eq("shop_id", shop_id)
                .in_("tag", list(to_remove))
                .execute()
            )
        if to_add:
            rows = [{"shop_id": shop_id, "owner_id": owner_id, "tag": tag} for tag in to_add]
            self._db.table("shop_owner_tags").insert(rows).execute()
        return tags

    # ── Reviews ────────────────────────────────────────────────────────────

    def get_reviews(self, shop_id: str, page: int = 1) -> list[dict[str, Any]]:
        limit = 20
        offset = (page - 1) * limit
        result = (
            self._db.table("check_ins")
            .select("id, note, rating, created_at, review_responses(id, body, created_at)")
            .eq("shop_id", shop_id)
            .not_.is_("note", "null")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return cast("list[dict[str, Any]]", result.data or [])

    def upsert_review_response(
        self, checkin_id: str, shop_id: str, owner_id: str, body: str
    ) -> ReviewResponseOut:
        from fastapi import HTTPException

        checkin = (
            self._db.table("check_ins")
            .select("shop_id")
            .eq("id", checkin_id)
            .maybe_single()
            .execute()
        )
        if not checkin or not checkin.data:
            raise HTTPException(status_code=404, detail="Check-in not found for this shop")
        checkin_data = cast("dict[str, Any]", checkin.data)
        if checkin_data["shop_id"] != shop_id:
            raise HTTPException(status_code=404, detail="Check-in not found for this shop")

        row = {
            "checkin_id": checkin_id,
            "shop_id": shop_id,
            "owner_id": owner_id,
            "body": body,
        }
        result = self._db.table("review_responses").upsert(row, on_conflict="checkin_id").execute()
        data = first(cast("list[dict[str, Any]]", result.data), "upsert review_response")
        return ReviewResponseOut(**data)
