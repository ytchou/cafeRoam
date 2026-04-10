import uuid
from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from core.lang import is_zh_dominant
from models.types import CHECKIN_MIN_TEXT_LENGTH, MAX_COMMUNITY_TEXTS, JobType
from providers.llm.interface import LLMProvider
from workers.job_guard import check_job_still_claimed
from workers.job_log import log_job_event
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_summarize_reviews(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
    job_id: str | uuid.UUID | None = None,
) -> None:
    """Generate a Claude community summary for a shop's check-in reviews.

    Fetches top 20 ranked check-in texts, calls Claude Haiku to summarize,
    stores the summary in shops.community_summary, then chains to GENERATE_EMBEDDING.
    If no qualifying texts exist, skips Claude and enqueues embedding directly.
    """
    shop_id = payload["shop_id"]
    logger.info("Summarizing reviews", shop_id=shop_id)

    if job_id is not None:
        await log_job_event(
            db,
            job_id,
            "info",
            "job.start",
            job_type="summarize_reviews",
            shop_id=str(shop_id),
        )

    try:
        # Fetch ranked check-in texts (same RPC used by generate_embedding)
        response = db.rpc(
            "get_ranked_checkin_texts",
            {
                "p_shop_id": shop_id,
                "p_min_length": CHECKIN_MIN_TEXT_LENGTH,
                "p_limit": MAX_COMMUNITY_TEXTS,
            },
        ).execute()

        rows = cast("list[dict[str, Any]]", response.data or [])
        texts = [row["text"] for row in rows if row.get("text")]

        if not texts:
            logger.info("No qualifying review texts — skipping summarization", shop_id=shop_id)
            await queue.enqueue(
                job_type=JobType.GENERATE_EMBEDDING,
                payload={"shop_id": shop_id},
                priority=2,
            )
            return

        # Generate community summary via Claude Haiku
        if job_id is not None:
            await log_job_event(
                db, job_id, "info", "llm.call", provider="anthropic", method="summarize_reviews"
            )

        summary = await llm.summarize_reviews(texts)

        if not summary:
            logger.warning("LLM returned empty summary — skipping DB write", shop_id=shop_id)
            await queue.enqueue(
                job_type=JobType.GENERATE_EMBEDDING,
                payload={"shop_id": shop_id},
                priority=2,
            )
            return

        if job_id is not None and not check_job_still_claimed(db, job_id):
            await log_job_event(db, job_id, "warn", "job.aborted_midflight", shop_id=str(shop_id))
            return

        if not is_zh_dominant(summary):
            logger.warning(
                "Community summary is not zh-TW dominant — skipping DB write",
                shop_id=shop_id,
                summary_preview=summary[:80],
            )
            raise ValueError(f"Community summary for shop {shop_id} is not in Traditional Chinese")

        # Persist summary to DB
        db.table("shops").update(
            {
                "community_summary": summary,
                "community_summary_updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", shop_id).execute()
        if job_id is not None:
            await log_job_event(
                db, job_id, "info", "db.write", table="shops", columns=["community_summary"]
            )

        logger.info(
            "Community summary generated",
            shop_id=shop_id,
            summary_length=len(summary),
            review_count=len(texts),
        )

        # Chain to embedding generation
        await queue.enqueue(
            job_type=JobType.GENERATE_EMBEDDING,
            payload={"shop_id": shop_id},
            priority=2,
        )

        if job_id is not None:
            await log_job_event(db, job_id, "info", "job.end", status="ok")

    except Exception as exc:
        if job_id is not None:
            await log_job_event(db, job_id, "error", "job.error", error=str(exc))
        raise
