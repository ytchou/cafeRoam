from typing import Any, cast

import structlog
from supabase import Client

from models.types import CHECKIN_MIN_TEXT_LENGTH, JobType
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_reembed_reviewed_shops(db: Client, queue: JobQueue) -> None:
    """Find shops with new check-in text since their last embedding and enqueue re-embed jobs.

    Called nightly by the scheduler. Uses an RPC to efficiently find shops where
    check_ins.created_at > shops.last_embedded_at and the check-in has qualifying text.
    """
    response = db.rpc(
        "find_shops_needing_review_reembed",
        {"p_min_text_length": CHECKIN_MIN_TEXT_LENGTH},
    ).execute()

    shop_rows = cast("list[dict[str, Any]]", response.data or [])
    if not shop_rows:
        logger.info("No shops need review re-embedding")
        return

    shop_ids = [row["id"] for row in shop_rows]
    logger.info("Re-embedding shops with new check-in text", count=len(shop_ids))

    await queue.enqueue_batch(
        job_type=JobType.SUMMARIZE_REVIEWS,
        payloads=[{"shop_id": sid} for sid in shop_ids],
        priority=2,  # lower than user-triggered work
    )

    logger.info("Enqueued review re-embed jobs", count=len(shop_ids))
