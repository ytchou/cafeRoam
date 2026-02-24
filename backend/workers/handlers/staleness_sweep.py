import structlog

from models.types import JobType
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_staleness_sweep(db, queue: JobQueue) -> None:
    """Find shops enriched >90 days ago and queue re-enrichment."""
    logger.info("Running staleness sweep")

    # Find stale shops via RPC (shops where enriched_at < now() - 90 days)
    response = db.rpc("find_stale_shops", {"days_threshold": 90}).execute()
    stale_shops = response.data

    for shop in stale_shops:
        await queue.enqueue(
            job_type=JobType.ENRICH_SHOP,
            payload={"shop_id": shop["id"]},
            priority=1,  # Low priority — background refresh
        )

    logger.info("Staleness sweep complete", stale_count=len(stale_shops))
