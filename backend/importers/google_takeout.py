from typing import Any

import structlog

from core.db import first
from core.regions import DEFAULT_REGION, REGIONS, GeoBounds
from importers.prefilter import (
    PreFilterSummary,
    is_fuzzy_duplicate,
    is_known_failed_location,
    validate_google_maps_url,
    validate_shop_name,
)

logger = structlog.get_logger()


def parse_takeout_places(
    geojson: dict[str, Any],
    bounds: GeoBounds | None = None,
) -> list[dict[str, Any]]:
    """Parse a Google Takeout Saved Places GeoJSON file.

    Returns a list of dicts with: name, google_maps_url, latitude, longitude, address.
    Filters to the given bounds (defaults to Greater Taipei).
    """
    if bounds is None:
        bounds = REGIONS[DEFAULT_REGION].bounds

    places: list[dict[str, Any]] = []

    for feature in geojson.get("features", []):
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue

        lng, lat = coords[0], coords[1]

        if not bounds.contains(lat, lng):
            continue

        props = feature.get("properties", {})
        location = props.get("Location", {})

        places.append(
            {
                "name": props.get("Title", "Unknown"),
                "google_maps_url": props.get("Google Maps URL", ""),
                "latitude": lat,
                "longitude": lng,
                "address": location.get("Address", ""),
            }
        )

    total = len(geojson.get("features", []))
    logger.info("Parsed takeout places", total=total, matched=len(places))
    return places


async def import_takeout_to_queue(
    geojson: dict[str, Any],
    db: Any,
    bounds: GeoBounds | None = None,
    region_name: str = "custom",
) -> dict[str, Any]:
    """Import Google Takeout places into the shops table with pre-filter.

    Runs pre-filter steps 1-4 synchronously; marks survivors as pending_url_check.
    Returns an import summary dict.
    """

    if bounds is None:
        bounds = REGIONS[DEFAULT_REGION].bounds

    places = parse_takeout_places(geojson, bounds)

    # Pre-fetch existing shops and failed shops for bulk dedup checks (avoids N+1 queries)
    existing_resp = (
        db.table("shops")
        .select("id, name, latitude, longitude")
        .gte("latitude", bounds.min_lat)
        .lte("latitude", bounds.max_lat)
        .gte("longitude", bounds.min_lng)
        .lte("longitude", bounds.max_lng)
        .execute()
    )
    existing_shops: list[dict[str, Any]] = existing_resp.data or []

    failed_resp = (
        db.table("shops")
        .select("id, latitude, longitude")
        .eq("processing_status", "failed")
        .gte("latitude", bounds.min_lat)
        .lte("latitude", bounds.max_lat)
        .gte("longitude", bounds.min_lng)
        .lte("longitude", bounds.max_lng)
        .execute()
    )
    failed_shops: list[dict[str, Any]] = failed_resp.data or []

    summary = PreFilterSummary()
    imported = 0

    for place in places:
        name = place.get("name", "Unknown")
        lat, lng = place["latitude"], place["longitude"]
        google_maps_url = place.get("google_maps_url", "")

        # Pre-filter step 1: URL format validation
        url_result = validate_google_maps_url(google_maps_url)
        if not url_result.passed:
            summary.invalid_url += 1
            continue

        # Pre-filter step 2: Name validation
        name_result = validate_shop_name(name)
        if not name_result.passed:
            summary.invalid_name += 1
            continue

        # Pre-filter step 3: Known-failed check (in-memory, pre-fetched above)
        if is_known_failed_location(lat, lng, failed_shops):
            summary.known_failed += 1
            continue

        # Pre-filter step 4: Fuzzy dedup (flag, do not auto-reject)
        if is_fuzzy_duplicate(name, lat, lng, existing_shops):
            summary.flagged_duplicates += 1

        # Exact dedup: skip if same name + approx coords already exists (in-memory)
        coord_delta = 0.001  # ~111m
        is_exact_dup = any(
            abs(float(s.get("latitude", 0)) - lat) <= coord_delta
            and abs(float(s.get("longitude", 0)) - lng) <= coord_delta
            and s.get("name", "").lower() == name.lower()
            for s in existing_shops
        )
        if is_exact_dup:
            logger.info("Skipping duplicate takeout place", name=name)
            continue

        try:
            response = (
                db.table("shops")
                .insert(
                    {
                        "name": name,
                        "address": place.get("address", ""),
                        "latitude": lat,
                        "longitude": lng,
                        "review_count": 0,
                        "processing_status": "pending_url_check",
                        "source": "google_takeout",
                        "google_maps_url": google_maps_url,
                    }
                )
                .execute()
            )
            first(response.data, "import takeout shop")
            imported += 1
        except Exception:
            logger.warning("Failed to import takeout place", name=name)
            continue

    logger.info("Takeout import complete", imported=imported)

    return {
        "imported": imported,
        "filtered": {
            "invalid_url": summary.invalid_url,
            "invalid_name": summary.invalid_name,
            "known_failed": summary.known_failed,
            "closed": 0,
        },
        "pending_url_check": imported,
        "flagged_duplicates": summary.flagged_duplicates,
        "region": region_name,
    }
