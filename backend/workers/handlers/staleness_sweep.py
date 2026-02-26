from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from models.types import JobType
from providers.scraper.interface import ScraperProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_staleness_sweep(db: Client, queue: JobQueue) -> None:
    """Find shops enriched >90 days ago and queue re-enrichment."""
    logger.info("Running staleness sweep")

    # Find stale shops via RPC (shops where enriched_at < now() - 90 days)
    response = db.rpc("find_stale_shops", {"days_threshold": 90}).execute()
    stale_shops = cast("list[dict[str, Any]]", response.data)

    for shop in stale_shops:
        await queue.enqueue(
            job_type=JobType.ENRICH_SHOP,
            payload={"shop_id": shop["id"]},
            priority=1,  # Low priority — background refresh
        )

    logger.info("Staleness sweep complete", stale_count=len(stale_shops))


async def handle_smart_staleness_sweep(
    db: Client,
    scraper: ScraperProvider,
    queue: JobQueue,
) -> None:
    """Smart staleness: only re-enrich when new Google reviews detected."""
    logger.info("Running smart staleness sweep")

    response = db.rpc("find_stale_shops", {"days_threshold": 90}).execute()
    stale_shops = cast("list[dict[str, Any]]", response.data)

    queued = 0
    skipped = 0
    now = datetime.now(UTC).isoformat()

    for shop in stale_shops:
        shop_id = shop["id"]
        google_place_id = shop.get("google_place_id")

        if not google_place_id:
            await queue.enqueue(
                job_type=JobType.ENRICH_SHOP,
                payload={"shop_id": shop_id},
                priority=1,
            )
            queued += 1
            continue

        # Get latest stored review date
        stored_reviews = (
            db.table("shop_reviews")
            .select("published_at")
            .eq("shop_id", shop_id)
            .order("published_at", desc=True)
            .limit(1)
            .execute()
        )
        latest_stored = stored_reviews.data[0]["published_at"] if stored_reviews.data else None  # type: ignore[index,call-overload]

        # Quick-scrape reviews only from Google Maps
        try:
            fresh_reviews = await scraper.scrape_reviews_only(google_place_id)
        except Exception as e:
            logger.warning("Failed to check reviews", shop_id=shop_id, error=str(e))
            db.table("shops").update({"last_checked_at": now}).eq("id", shop_id).execute()
            skipped += 1
            continue

        # Compare: are there newer reviews?
        has_new = False
        if fresh_reviews and latest_stored:
            newest_scraped = max(
                (r.get("published_at", "") for r in fresh_reviews if r.get("published_at")),
                default="",
            )
            if newest_scraped and newest_scraped > latest_stored:  # type: ignore[operator]
                has_new = True
        elif fresh_reviews and not latest_stored:
            has_new = True

        if has_new:
            await queue.enqueue(
                job_type=JobType.ENRICH_SHOP,
                payload={"shop_id": shop_id},
                priority=1,
            )
            queued += 1
        else:
            db.table("shops").update({"last_checked_at": now}).eq("id", shop_id).execute()
            skipped += 1

    logger.info(
        "Smart staleness sweep complete",
        stale_count=len(stale_shops),
        queued=queued,
        skipped=skipped,
    )
