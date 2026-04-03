"""Service for district-based shop discovery. Mirrors vibe_service.py pattern."""

from typing import Any, cast

from supabase import Client

from core.db import first
from models.types import District, DistrictShopResult, DistrictShopsResponse

_DISTRICT_COLS = "id, slug, name_en, name_zh, description_en, description_zh, city, shop_count, sort_order"

_SHOP_COLS = (
    "id, name, slug, rating, review_count, address, mrt, "
    "processing_status, shop_photos(url)"
)


class DistrictService:
    def __init__(self, db: Client):
        self._db = db

    def get_districts(self, min_shops: int = 3) -> list[District]:
        """Return active districts with at least min_shops live shops."""
        response = (
            self._db.table("districts")
            .select(_DISTRICT_COLS)
            .eq("is_active", True)
            .gte("shop_count", min_shops)
            .order("sort_order")
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        return [District(**row) for row in rows if row.get("shop_count", 0) >= min_shops]

    def get_shops_for_district(
        self,
        slug: str,
        vibe_slug: str | None = None,
    ) -> DistrictShopsResponse:
        """Return live shops in a district, optionally filtered by vibe tags."""
        district = self._fetch_district(slug)
        shop_rows = self._fetch_shops(district.id, vibe_slug)

        results: list[DistrictShopResult] = []
        for row in shop_rows:
            photos = row.get("shop_photos") or []
            first_photo = next(iter(photos), None)
            cover = first_photo["url"] if first_photo else None

            results.append(
                DistrictShopResult(
                    shop_id=row["id"],
                    name=row["name"],
                    slug=row.get("slug"),
                    rating=float(row["rating"]) if row.get("rating") else None,
                    review_count=row.get("review_count") or 0,
                    cover_photo_url=cover,
                    address=row.get("address"),
                    mrt=row.get("mrt"),
                    matched_tag_labels=row.get("_matched_tags", []),
                )
            )

        results.sort(key=lambda r: (-(r.rating or 0), r.name))
        return DistrictShopsResponse(
            district=district, shops=results, total_count=len(results)
        )

    def _fetch_district(self, slug: str) -> District:
        response = (
            self._db.table("districts")
            .select(_DISTRICT_COLS)
            .eq("slug", slug)
            .eq("is_active", True)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        if not rows:
            raise ValueError(f"District '{slug}' not found")
        return District(**first(rows, f"district '{slug}'"))

    def _fetch_shops(
        self,
        district_id: str,
        vibe_slug: str | None,
    ) -> list[dict[str, Any]]:
        """Fetch live shops in district. If vibe_slug, filter by vibe tags."""
        if vibe_slug:
            return self._fetch_shops_with_vibe(district_id, vibe_slug)

        response = (
            self._db.table("shops")
            .select(_SHOP_COLS)
            .eq("district_id", district_id)
            .eq("processing_status", "live")
            .limit(200)
            .execute()
        )
        return cast("list[dict[str, Any]]", response.data or [])

    def _fetch_shops_with_vibe(
        self, district_id: str, vibe_slug: str
    ) -> list[dict[str, Any]]:
        """Fetch shops in district that match a vibe's tags."""
        # 1. Get vibe tag_ids
        vibe_resp = (
            self._db.table("vibe_collections")
            .select("id, slug, tag_ids")
            .eq("slug", vibe_slug)
            .execute()
        )
        vibe_rows = cast("list[dict[str, Any]]", vibe_resp.data or [])
        if not vibe_rows:
            return []
        tag_ids = (first(vibe_rows) or {}).get("tag_ids") or []
        if not tag_ids:
            return []

        # 2. Get shop_ids in district that have matching tags
        tag_resp = (
            self._db.table("shop_tags")
            .select("shop_id, tag_id")
            .in_("tag_id", tag_ids)
            .limit(10000)
            .execute()
        )
        tag_rows = cast("list[dict[str, Any]]", tag_resp.data or [])
        shop_tag_map: dict[str, list[str]] = {}
        for row in tag_rows:
            shop_tag_map.setdefault(row["shop_id"], []).append(row["tag_id"])

        if not shop_tag_map:
            return []

        # 3. Fetch those shops, filtered by district
        shop_resp = (
            self._db.table("shops")
            .select(_SHOP_COLS)
            .eq("district_id", district_id)
            .eq("processing_status", "live")
            .in_("id", list(shop_tag_map.keys()))
            .limit(200)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", shop_resp.data or [])

        # Attach matched tag labels
        all_tag_ids_flat = list({tid for tids in shop_tag_map.values() for tid in tids})
        label_resp = (
            self._db.table("taxonomy_tags")
            .select("id, label")
            .in_("id", all_tag_ids_flat)
            .execute()
        )
        label_rows = cast("list[dict[str, Any]]", label_resp.data or [])
        id_to_label: dict[str, str] = {r["id"]: r["label"] for r in label_rows}

        for row in rows:
            matched_ids = shop_tag_map.get(row["id"], [])
            row["_matched_tags"] = [id_to_label.get(tid, tid) for tid in matched_ids]

        return rows
