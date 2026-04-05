import asyncio
import random
from datetime import datetime
from typing import Any, cast
from zoneinfo import ZoneInfo

from supabase import Client

from core.geo import bounding_box, haversine
from core.opening_hours import is_open_now
from models.types import TarotCard

TW = ZoneInfo("Asia/Taipei")


class TarotService:
    def __init__(self, db: Client):
        self._db = db

    async def draw(
        self,
        lat: float | None,
        lng: float | None,
        radius_km: float,
        excluded_ids: list[str],
        now: datetime | None = None,
        district_ids: list[str] | None = None,
    ) -> list[TarotCard]:
        """Draw up to 3 tarot cards from nearby open shops with unique titles."""
        if now is None:
            now = datetime.now(TW)

        if district_ids:
            rows = await self._query_district_shops(district_ids)
        else:
            assert lat is not None and lng is not None
            rows = await self._query_nearby_shops(lat, lng, radius_km)

        excluded_set = set(excluded_ids)
        candidates: list[dict[str, Any]] = []
        for row in rows:
            if row["id"] in excluded_set:
                continue
            if not row.get("tarot_title"):
                continue
            open_status = is_open_now(row.get("opening_hours"), now)
            if open_status is False:
                continue
            candidates.append(row)

        by_title: dict[str, list[dict[str, Any]]] = {}
        for c in candidates:
            by_title.setdefault(c["tarot_title"], []).append(c)

        unique_pool: list[dict[str, Any]] = [random.choice(shops) for shops in by_title.values()]

        chosen = random.sample(unique_pool, min(3, len(unique_pool)))

        return [self._to_card(row, lat, lng, now) for row in chosen]

    async def _query_nearby_shops(
        self, lat: float, lng: float, radius_km: float
    ) -> list[dict[str, Any]]:
        """Query shops within bounding box using PostgREST filters."""
        lat_min, lat_max, lng_min, lng_max = bounding_box(lat, lng, radius_km)

        def _query() -> list[dict[str, Any]]:
            response = (
                self._db.table("shops")
                .select(
                    "id, name, slug, address, city, latitude, longitude, "
                    "rating, review_count, opening_hours, tarot_title, flavor_text, "
                    "processing_status, shop_photos(url)"
                )
                .eq("processing_status", "live")
                .not_.is_("tarot_title", "null")
                .gte("latitude", lat_min)
                .lte("latitude", lat_max)
                .gte("longitude", lng_min)
                .lte("longitude", lng_max)
                .limit(200)
                .execute()
            )
            return cast("list[dict[str, Any]]", response.data or [])

        return await asyncio.to_thread(_query)

    async def _query_district_shops(self, district_ids: list[str]) -> list[dict[str, Any]]:
        """Query shops within one or more districts using FK filter."""

        def _query() -> list[dict[str, Any]]:
            response = (
                self._db.table("shops")
                .select(
                    "id, name, slug, address, city, latitude, longitude, "
                    "rating, review_count, opening_hours, tarot_title, flavor_text, "
                    "processing_status, shop_photos(url)"
                )
                .eq("processing_status", "live")
                .not_.is_("tarot_title", "null")
                .in_("district_id", district_ids)
                .limit(200)
                .execute()
            )
            return cast("list[dict[str, Any]]", response.data or [])

        return await asyncio.to_thread(_query)

    def _to_card(
        self, row: dict[str, Any], user_lat: float | None, user_lng: float | None, now: datetime
    ) -> TarotCard:
        photos = row.get("shop_photos") or []
        first_photo = next(iter(photos), None)
        cover = first_photo["url"] if first_photo else None

        distance = 0.0
        if user_lat is not None and user_lng is not None:
            distance = round(
                haversine(user_lat, user_lng, row["latitude"], row["longitude"]),
                1,
            )

        return TarotCard(
            shop_id=row["id"],
            tarot_title=row["tarot_title"],
            flavor_text=row.get("flavor_text") or "",
            is_open_now=is_open_now(row.get("opening_hours"), now) is True,
            distance_km=distance,
            name=row["name"],
            neighborhood=row.get("city") or "",
            cover_photo_url=cover,
            rating=float(row["rating"]) if row.get("rating") else None,
            review_count=row.get("review_count") or 0,
            slug=row.get("slug"),
        )
