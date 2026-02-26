from typing import Any

import structlog

logger = structlog.get_logger()

# Taiwan bounding box (approximate)
TAIWAN_BOUNDS = {
    "min_lat": 21.5,
    "max_lat": 26.5,
    "min_lng": 119.0,
    "max_lng": 122.5,
}


def parse_takeout_places(geojson: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse a Google Takeout Saved Places GeoJSON file.

    Returns a list of dicts with: name, google_maps_url, latitude, longitude, address.
    Filters to Taiwan coordinates only.
    """
    places: list[dict[str, Any]] = []

    for feature in geojson.get("features", []):
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue

        lng, lat = coords[0], coords[1]

        # Filter to Taiwan bounding box
        if not (
            TAIWAN_BOUNDS["min_lat"] <= lat <= TAIWAN_BOUNDS["max_lat"]
            and TAIWAN_BOUNDS["min_lng"] <= lng <= TAIWAN_BOUNDS["max_lng"]
        ):
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

    logger.info("Parsed takeout places", total=len(geojson.get("features", [])), taiwan=len(places))
    return places


async def import_takeout_to_queue(
    geojson: dict[str, Any],
    db: Any,
    queue: Any,
) -> int:
    """Import Google Takeout places into the shops table and queue scrape jobs.

    Returns the number of shops queued.
    """
    from models.types import JobType

    places = parse_takeout_places(geojson)
    queued = 0

    for place in places:
        if not place.get("google_maps_url"):
            continue

        # Insert pending shop
        response = (
            db.table("shops")
            .insert(
                {
                    "name": place["name"],
                    "address": place.get("address", ""),
                    "latitude": place["latitude"],
                    "longitude": place["longitude"],
                    "review_count": 0,
                    "processing_status": "pending",
                    "source": "google_takeout",
                }
            )
            .execute()
        )
        shop_id = response.data[0]["id"]

        # Queue scrape job
        await queue.enqueue(
            job_type=JobType.SCRAPE_SHOP,
            payload={
                "shop_id": shop_id,
                "google_maps_url": place["google_maps_url"],
            },
            priority=0,
        )
        queued += 1

    logger.info("Takeout import complete", queued=queued)
    return queued
