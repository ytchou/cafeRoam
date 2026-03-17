from typing import Any, cast

from supabase import Client

from core.db import first
from core.geo import bounding_box, haversine
from models.types import VibeCollection, VibeShopResult, VibeShopsResponse

_VIBE_COLS = "id, slug, name, name_zh, emoji, subtitle, subtitle_zh, tag_ids, sort_order"


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
        shop_matches = self._fetch_matching_shop_ids(vibe.tag_ids)

        if not shop_matches:
            return VibeShopsResponse(vibe=vibe, shops=[], total_count=0)

        shop_rows = self._fetch_shop_details(
            list(shop_matches.keys()), lat, lng, radius_km
        )

        total_tags = len(vibe.tag_ids)
        results: list[VibeShopResult] = []
        for row in shop_rows:
            shop_id = row["id"]
            matched_tags = shop_matches.get(shop_id, [])
            if not matched_tags:
                continue
            match_count = len(matched_tags)

            photos = row.get("shop_photos") or []
            first_photo = next(iter(photos), None)
            cover = first_photo["url"] if first_photo else None

            distance_km: float | None = None
            if (
                lat is not None
                and lng is not None
                and row.get("latitude") is not None
                and row.get("longitude") is not None
            ):
                distance_km = round(
                    haversine(lat, lng, row["latitude"], row["longitude"]), 1
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
                    matched_tag_labels=matched_tags,
                )
            )

        results.sort(key=lambda r: (-r.overlap_score, -(r.rating or 0)))
        returned = results[:50]
        return VibeShopsResponse(vibe=vibe, shops=returned, total_count=len(returned))

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
            raise ValueError(f"Vibe '{slug}' not found")
        return VibeCollection(**first(rows, f"vibe '{slug}'"))

    def _fetch_matching_shop_ids(self, tag_ids: list[str]) -> dict[str, list[str]]:
        """Return dict mapping shop_id → list of matched tag_ids."""
        response = (
            self._db.table("shop_tags")
            .select("shop_id, tag_id")
            .in_("tag_id", tag_ids)
            .limit(10000)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        result: dict[str, list[str]] = {}
        for row in rows:
            result.setdefault(row["shop_id"], []).append(row["tag_id"])
        return result

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
            lat_min, lat_max, lng_min, lng_max = bounding_box(lat, lng, radius_km)
            builder = (
                builder
                .not_("latitude", "is", "null")
                .gte("latitude", lat_min)
                .lte("latitude", lat_max)
                .gte("longitude", lng_min)
                .lte("longitude", lng_max)
            )
        return cast("list[dict[str, Any]]", builder.limit(200).execute().data or [])
