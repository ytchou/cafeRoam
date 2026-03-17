import asyncio
import math
import random
from datetime import datetime
from typing import Any, cast
from zoneinfo import ZoneInfo

from supabase import Client

from core.opening_hours import is_open_now
from models.types import TarotCard

TW = ZoneInfo("Asia/Taipei")

_EARTH_RADIUS_KM = 6371.0


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return _EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(a))


class TarotService:
    def __init__(self, db: Client):
        self._db = db

    async def draw(
        self,
        lat: float,
        lng: float,
        radius_km: float,
        excluded_ids: list[str],
        now: datetime | None = None,
    ) -> list[TarotCard]:
        """Draw up to 3 tarot cards from nearby open shops with unique titles."""
        if now is None:
            now = datetime.now(TW)

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
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))

        def _query() -> list[dict[str, Any]]:
            response = (  # type: ignore[operator]  # supabase-py stubs lose type after not_()
                self._db.table("shops")
                .select(
                    "id, name, slug, address, city, latitude, longitude, "
                    "rating, review_count, opening_hours, tarot_title, flavor_text, "
                    "processing_status, shop_photos(url)"
                )
                .eq("processing_status", "live")
                .not_("tarot_title", "is", "null")
                .gte("latitude", lat - lat_delta)
                .lte("latitude", lat + lat_delta)
                .gte("longitude", lng - lng_delta)
                .lte("longitude", lng + lng_delta)
                .limit(200)
                .execute()
            )
            return cast("list[dict[str, Any]]", response.data or [])

        return await asyncio.to_thread(_query)

    def _to_card(
        self, row: dict[str, Any], user_lat: float, user_lng: float, now: datetime
    ) -> TarotCard:
        photos = row.get("shop_photos") or []
        first_photo = next(iter(photos), None)
        cover = first_photo["url"] if first_photo else None

        return TarotCard(
            shop_id=row["id"],
            tarot_title=row["tarot_title"],
            flavor_text=row.get("flavor_text") or "",
            is_open_now=is_open_now(row.get("opening_hours"), now) is True,
            distance_km=round(
                _haversine(user_lat, user_lng, row["latitude"], row["longitude"]),
                1,
            ),
            name=row["name"],
            neighborhood=row.get("city") or "",
            cover_photo_url=cover,
            rating=float(row["rating"]) if row.get("rating") else None,
            review_count=row.get("review_count") or 0,
            slug=row.get("slug"),
        )
