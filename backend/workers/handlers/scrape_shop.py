from datetime import UTC, datetime
from typing import Any

import structlog
from supabase import Client

from models.types import JobType
from providers.scraper.interface import ScraperProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_scrape_shop(
    payload: dict[str, Any],
    db: Client,
    scraper: ScraperProvider,
    queue: JobQueue,
) -> None:
    """Scrape a shop from Google Maps via Apify and store the data."""
    shop_id = payload["shop_id"]
    google_maps_url = payload["google_maps_url"]
    submission_id = payload.get("submission_id")

    logger.info("Scraping shop", shop_id=shop_id, url=google_maps_url)

    # Update processing status
    db.table("shops").update(
        {"processing_status": "scraping", "updated_at": datetime.now(UTC).isoformat()}
    ).eq("id", shop_id).execute()

    # Scrape via Apify
    data = await scraper.scrape_by_url(google_maps_url)

    if data is None:
        logger.warning("Shop not found on Google Maps", shop_id=shop_id, url=google_maps_url)
        db.table("shops").update(
            {"processing_status": "failed", "updated_at": datetime.now(UTC).isoformat()}
        ).eq("id", shop_id).execute()

        if submission_id:
            db.table("shop_submissions").update(
                {
                    "status": "failed",
                    "failure_reason": "Place not found on Google Maps",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", submission_id).execute()

        raise ValueError(f"Place not found for URL: {google_maps_url}")

    # Update shop with scraped data
    db.table("shops").update(
        {
            "name": data.name,
            "address": data.address,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "google_place_id": data.google_place_id,
            "rating": data.rating,
            "review_count": data.review_count,
            "opening_hours": data.opening_hours,
            "phone": data.phone,
            "website": data.website,
            "menu_url": data.menu_url,
            "processing_status": "scraping",
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", shop_id).execute()

    # Store reviews
    if data.reviews:
        review_rows = [
            {
                "shop_id": shop_id,
                "text": r["text"],
                "stars": r.get("stars"),
                "published_at": r.get("published_at"),
            }
            for r in data.reviews
            if r.get("text")
        ]
        if review_rows:
            db.table("shop_reviews").upsert(review_rows).execute()

    # Store photos
    if data.photo_urls:
        photo_rows = [
            {"shop_id": shop_id, "url": url, "sort_order": i}
            for i, url in enumerate(data.photo_urls)
        ]
        db.table("shop_photos").upsert(photo_rows).execute()

    # Link submission to shop
    if submission_id:
        db.table("shop_submissions").update(
            {
                "shop_id": shop_id,
                "status": "processing",
                "updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", submission_id).execute()

    # Queue enrichment
    await queue.enqueue(
        job_type=JobType.ENRICH_SHOP,
        payload={"shop_id": shop_id, "submission_id": submission_id},
        priority=5,
    )

    logger.info(
        "Shop scraped",
        shop_id=shop_id,
        reviews=len(data.reviews),
        photos=len(data.photo_urls),
    )
