from typing import Any

import httpx
import structlog

from importers.google_takeout import TAIWAN_BOUNDS

logger = structlog.get_logger()

CAFENOMAD_API_URL = "https://cafenomad.tw/api/v1.2/cafes/taipei"


def filter_cafenomad_shops(shops: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Filter Cafe Nomad shops: remove closed, out-of-bounds."""
    filtered = []
    for shop in shops:
        if shop.get("closed"):
            continue

        lat = float(shop.get("latitude", 0))
        lng = float(shop.get("longitude", 0))
        if not (
            TAIWAN_BOUNDS["min_lat"] <= lat <= TAIWAN_BOUNDS["max_lat"]
            and TAIWAN_BOUNDS["min_lng"] <= lng <= TAIWAN_BOUNDS["max_lng"]
        ):
            continue

        filtered.append(shop)

    return filtered


async def fetch_and_import_cafenomad(db: Any, queue: Any) -> int:
    """Fetch Cafe Nomad API and import shops into queue.

    Returns the number of shops queued.
    """
    from models.types import JobType

    async with httpx.AsyncClient() as client:
        response = await client.get(CAFENOMAD_API_URL, timeout=30)
        response.raise_for_status()
        raw_shops = response.json()

    shops = filter_cafenomad_shops(raw_shops)
    queued = 0

    for shop in shops:
        cafenomad_id = shop.get("id", "")

        # Check if already imported
        existing = db.table("shops").select("id").eq("cafenomad_id", cafenomad_id).execute()
        if existing.data:
            continue

        insert_response = (
            db.table("shops")
            .insert(
                {
                    "name": shop.get("name", "Unknown"),
                    "address": shop.get("address", ""),
                    "latitude": float(shop.get("latitude", 0)),
                    "longitude": float(shop.get("longitude", 0)),
                    "review_count": 0,
                    "cafenomad_id": cafenomad_id,
                    "processing_status": "pending",
                    "source": "cafe_nomad",
                    "website": shop.get("url"),
                    "mrt": shop.get("mrt"),
                }
            )
            .execute()
        )
        shop_id = insert_response.data[0]["id"]

        google_maps_url = f"https://www.google.com/maps/search/{shop.get('name', '')}+{shop.get('address', '')}"
        await queue.enqueue(
            job_type=JobType.SCRAPE_SHOP,
            payload={"shop_id": shop_id, "google_maps_url": google_maps_url},
            priority=0,
        )
        queued += 1

    logger.info("Cafe Nomad import complete", total=len(raw_shops), filtered=len(shops), queued=queued)
    return queued
