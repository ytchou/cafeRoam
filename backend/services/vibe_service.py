import math
from collections import Counter
from typing import Any, cast

from fastapi import HTTPException
from supabase import Client

from models.types import VibeCollection, VibeShopResult, VibeShopsResponse

_EARTH_RADIUS_KM = 6371.0
_VIBE_COLS = "id, slug, name, name_zh, emoji, subtitle, subtitle_zh, tag_ids, sort_order"


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return _EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(a))


class VibeService:
    def __init__(self, db: Client):
        self._db = db

    def get_vibes(self) -> list[VibeCollection]:
        """Return all active vibe collections ordered by sort_order."""
        response = (
            self._db.table("vibe_collections")
            .select(_VIBE_COLS)
            .eq("is_active", True)
            .order("sort_order")
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        return [VibeCollection(**row) for row in rows]

    def get_shops_for_vibe(
        self,
        slug: str,
        lat: float | None = None,
        lng: float | None = None,
        radius_km: float = 5.0,
    ) -> VibeShopsResponse:
        """Return shops matching a vibe, ranked by tag overlap score."""
        vibe = self._fetch_vibe(slug)
        shop_ids_with_counts = self._fetch_matching_shop_ids(vibe.tag_ids)

        if not shop_ids_with_counts:
            return VibeShopsResponse(vibe=vibe, shops=[], total_count=0)

        shop_rows = self._fetch_shop_details(
            list(shop_ids_with_counts.keys()), lat, lng, radius_km
        )

        total_tags = len(vibe.tag_ids)
        results: list[VibeShopResult] = []
        for row in shop_rows:
            shop_id = row["id"]
            match_count = shop_ids_with_counts.get(shop_id, 0)
            if match_count == 0:
                continue

            photos = row.get("shop_photos") or []
            first_photo = next(iter(photos), None)
            cover = first_photo["url"] if first_photo else None

            distance_km: float | None = None
            if lat is not None and lng is not None and row.get("latitude") and row.get("longitude"):
                distance_km = round(
                    _haversine(lat, lng, row["latitude"], row["longitude"]), 1
                )

            results.append(
                VibeShopResult(
                    shop_id=shop_id,
                    name=row["name"],
                    slug=row.get("slug"),
                    rating=float(row["rating"]) if row.get("rating") else None,
                    review_count=row.get("review_count") or 0,
                    cover_photo_url=cover,
                    distance_km=distance_km,
                    overlap_score=round(match_count / total_tags, 4),
                    matched_tag_labels=[],
                )
            )

        results.sort(key=lambda r: (-r.overlap_score, -(r.rating or 0)))
        return VibeShopsResponse(vibe=vibe, shops=results[:50], total_count=len(results))

    def _fetch_vibe(self, slug: str) -> VibeCollection:
        response = (
            self._db.table("vibe_collections")
            .select(_VIBE_COLS)
            .eq("slug", slug)
            .eq("is_active", True)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        if not rows:
            raise HTTPException(status_code=404, detail=f"Vibe '{slug}' not found")
        return VibeCollection(**rows[0])

    def _fetch_matching_shop_ids(self, tag_ids: list[str]) -> "Counter[str]":
        """Return Counter mapping shop_id → number of matching tags."""
        response = (
            self._db.table("shop_tags")
            .select("shop_id")
            .in_("tag_id", tag_ids)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        return Counter(row["shop_id"] for row in rows)

    def _fetch_shop_details(
        self,
        shop_ids: list[str],
        lat: float | None,
        lng: float | None,
        radius_km: float,
    ) -> list[dict[str, Any]]:
        _cols = (
            "id, name, slug, latitude, longitude, rating, "
            "review_count, processing_status, shop_photos(url)"
        )
        builder: Any = (
            self._db.table("shops")
            .select(_cols)
            .eq("processing_status", "live")
            .in_("id", shop_ids)
        )
        if lat is not None and lng is not None:
            lat_delta = radius_km / 111.0
            lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
            builder = (
                builder
                .not_("latitude", "is", "null")
                .gte("latitude", lat - lat_delta)
                .lte("latitude", lat + lat_delta)
                .gte("longitude", lng - lng_delta)
                .lte("longitude", lng + lng_delta)
            )
        return cast("list[dict[str, Any]]", builder.limit(200).execute().data or [])
