from __future__ import annotations
import logging
import httpx
from collections import Counter
from typing import Any
from supabase import Client
from core.config import settings
from models.owner import (
    DashboardStats, SearchInsight, CommunityPulseTag, DistrictRanking,
    OwnerStoryOut, OwnerStoryIn, ShopInfoIn, ReviewResponseOut, ReviewResponseIn,
)
from core.db import first

logger = logging.getLogger(__name__)

_POSTHOG_QUERY_URL = "https://us.posthog.com/api/projects/{project_id}/query/"


class OwnerService:
    def __init__(self, db: Client) -> None:
        self._db = db

    # ── Stats ──────────────────────────────────────────────────────────────

    def get_dashboard_stats(self, shop_id: str) -> DashboardStats:
        """Aggregate check-ins, followers, saves, page views for last 30 days."""
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

        checkin_count = (
            self._db.table("check_ins")
            .select("id", count="exact")
            .eq("shop_id", shop_id)
            .gte("created_at", cutoff)
            .execute()
            .count or 0
        )
        follower_count = (
            self._db.table("shop_followers")
            .select("id", count="exact")
            .eq("shop_id", shop_id)
            .execute()
            .count or 0
        )
        saves_count = (
            self._db.table("list_items")
            .select("id", count="exact")
            .eq("shop_id", shop_id)
            .gte("created_at", cutoff)
            .execute()
            .count or 0
        )
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
        rows = self._query_posthog(
            f"SELECT count() as views FROM events "
            f"WHERE event = '$pageview' "
            f"AND properties.$current_url LIKE '%/shops/{shop_id}%' "
            f"AND timestamp >= now() - interval 30 day"
        )
        return int(rows[0]["views"]) if rows else 0

    # ── Analytics ──────────────────────────────────────────────────────────

    def get_search_insights(self, shop_id: str) -> list[SearchInsight]:
        rows = self._query_posthog(
            f"SELECT properties.query as query, count() as impressions "
            f"FROM events "
            f"WHERE event = 'search_result_shown' "
            f"AND JSONExtractArrayRaw(properties.shop_ids, 0) LIKE '%{shop_id}%' "
            f"AND timestamp >= now() - interval 30 day "
            f"GROUP BY query ORDER BY impressions DESC LIMIT 10"
        )
        return [SearchInsight(query=r["query"], impressions=int(r["impressions"])) for r in rows]

    def get_community_pulse(self, shop_id: str) -> list[CommunityPulseTag]:
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

        result = (
            self._db.table("check_ins")
            .select("tags")
            .eq("shop_id", shop_id)
            .gte("created_at", cutoff)
            .execute()
        )
        all_tags: list[str] = []
        for row in (result.data or []):
            all_tags.extend(row.get("tags") or [])

        counter = Counter(all_tags)
        return [
            CommunityPulseTag(tag=tag, count=count)
            for tag, count in counter.most_common(10)
        ]

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

        district = shop.data["district"]
        peers = (
            self._db.table("shops")
            .select("id, mode_work, mode_rest, mode_social")
            .eq("district", district)
            .execute()
        )
        attrs = ["mode_work", "mode_rest", "mode_social"]
        labels = {"mode_work": "工作", "mode_rest": "休息", "mode_social": "社交"}
        rankings = []
        for attr in attrs:
            scores = sorted(
                [(r["id"], r.get(attr) or 0) for r in (peers.data or [])],
                key=lambda x: x[1],
                reverse=True,
            )
            rank = next((i + 1 for i, (sid, _) in enumerate(scores) if sid == shop_id), None)
            if rank:
                rankings.append(DistrictRanking(
                    attribute=labels[attr],
                    rank=rank,
                    total_in_district=len(scores),
                ))
        return sorted(rankings, key=lambda r: r.rank)[:3]

    # ── Shop Story ─────────────────────────────────────────────────────────

    def get_shop_story(self, shop_id: str) -> OwnerStoryOut | None:
        result = (
            self._db.table("shop_content")
            .select("*")
            .eq("shop_id", shop_id)
            .eq("content_type", "story")
            .maybe_single()
            .execute()
        )
        if not result.data:
            return None
        return OwnerStoryOut(**result.data)

    def upsert_shop_story(
        self, shop_id: str, owner_id: str, data: OwnerStoryIn
    ) -> OwnerStoryOut:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
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
            self._db.table("shop_content")
            .upsert(row, on_conflict="shop_id,content_type")
            .execute()
        )
        return OwnerStoryOut(**first(result.data, "upsert shop_content"))

    # ── Shop Info ──────────────────────────────────────────────────────────

    def update_shop_info(self, shop_id: str, owner_id: str, data: ShopInfoIn) -> dict:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        result = (
            self._db.table("shops")
            .update(updates)
            .eq("id", shop_id)
            .execute()
        )
        return first(result.data, "update shop info")

    # ── Owner Tags ─────────────────────────────────────────────────────────

    def get_owner_tags(self, shop_id: str) -> list[str]:
        result = (
            self._db.table("shop_owner_tags")
            .select("tag")
            .eq("shop_id", shop_id)
            .order("created_at")
            .execute()
        )
        return [row["tag"] for row in (result.data or [])]

    def update_owner_tags(
        self, shop_id: str, owner_id: str, tags: list[str]
    ) -> list[str]:
        if len(tags) > 10:
            raise ValueError(f"Shop owners may set a maximum 10 tags; got {len(tags)}")

        # Replace entire set atomically: delete then insert
        self._db.table("shop_owner_tags").delete().eq("shop_id", shop_id).execute()

        if not tags:
            return []

        rows = [
            {"shop_id": shop_id, "owner_id": owner_id, "tag": tag}
            for tag in tags
        ]
        self._db.table("shop_owner_tags").insert(rows).execute()
        return tags

    # ── Reviews ────────────────────────────────────────────────────────────

    def get_reviews(self, shop_id: str, page: int = 1) -> list[dict]:
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
        return result.data or []

    def upsert_review_response(
        self, checkin_id: str, shop_id: str, owner_id: str, body: str
    ) -> ReviewResponseOut:
        row = {
            "checkin_id": checkin_id,
            "shop_id": shop_id,
            "owner_id": owner_id,
            "body": body,
        }
        result = (
            self._db.table("review_responses")
            .upsert(row, on_conflict="checkin_id")
            .execute()
        )
        data = first(result.data, "upsert review_response")
        return ReviewResponseOut(**data)

    # ── PostHog HogQL helper ───────────────────────────────────────────────

    def _query_posthog(self, hogql: str) -> list[dict[str, Any]]:
        """Execute a HogQL query against PostHog Query API."""
        if not settings.posthog_api_key or not settings.posthog_project_id:
            logger.warning("PostHog not configured — skipping query")
            return []

        url = _POSTHOG_QUERY_URL.format(project_id=settings.posthog_project_id)
        resp = httpx.post(
            url,
            headers={"Authorization": f"Bearer {settings.posthog_api_key}"},
            json={"query": {"kind": "HogQLQuery", "query": hogql}},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        columns = data["columns"]
        return [dict(zip(columns, row)) for row in data["results"]]
