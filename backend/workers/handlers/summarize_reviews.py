from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from core.lang import is_zh_dominant
from models.types import CHECKIN_MIN_TEXT_LENGTH, MAX_COMMUNITY_TEXTS, JobType, ReviewSummaryResult
from providers.llm.interface import LLMProvider
from workers.job_guard import check_job_still_claimed
from workers.job_log import log_job_event
from workers.queue import JobQueue

logger = structlog.get_logger()
MAX_GOOGLE_REVIEWS = 50


async def handle_summarize_reviews(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
    job_id: str,
) -> None:
    """Generate a community summary for a shop from Google and check-in reviews.

    Fetches Google reviews plus top ranked check-in texts, calls the LLM to summarize,
    stores the summary and review topics in shops, then chains to GENERATE_EMBEDDING.
    If no qualifying texts exist from either source, skips the LLM and enqueues embedding directly.
    """
    shop_id = payload["shop_id"]
    logger.info("Summarizing reviews", shop_id=shop_id)

    try:
        await log_job_event(
            db,
            job_id,
            "info",
            "job.start",
            job_type="summarize_reviews",
            shop_id=str(shop_id),
        )

        reviews_result = db.table("shop_reviews").select("text").eq("shop_id", shop_id).execute()
        google_reviews = [
            row["text"] for row in cast("list[dict[str, Any]]", reviews_result.data or []) if row.get("text")
        ][:MAX_GOOGLE_REVIEWS]

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
        checkin_texts = [row["text"] for row in rows if row.get("text")]

        if not google_reviews and not checkin_texts:
            logger.info("No qualifying review texts — skipping summarization", shop_id=shop_id)
            await queue.enqueue(
                job_type=JobType.GENERATE_EMBEDDING,
                payload={"shop_id": shop_id},
                priority=2,
            )
            return

        # Generate community summary via Claude Haiku
        await log_job_event(
            db, job_id, "info", "llm.call", provider="anthropic", method="summarize_reviews"
        )

        result = cast(
            ReviewSummaryResult,
            await llm.summarize_reviews(
                google_reviews=google_reviews,
                checkin_texts=checkin_texts,
            ),
        )

        if not result.summary_zh_tw:
            logger.warning("LLM returned empty summary — skipping DB write", shop_id=shop_id)
            await queue.enqueue(
                job_type=JobType.GENERATE_EMBEDDING,
                payload={"shop_id": shop_id},
                priority=2,
            )
            return

        if not await check_job_still_claimed(queue, job_id):
            await log_job_event(db, job_id, "warn", "job.aborted_midflight", shop_id=str(shop_id))
            return

        if not is_zh_dominant(result.summary_zh_tw):
            logger.warning(
                "Community summary is not zh-TW dominant — skipping DB write",
                shop_id=shop_id,
                summary_preview=result.summary_zh_tw[:80],
            )
            raise ValueError(f"Community summary for shop {shop_id} is not in Traditional Chinese")

        # Persist summary to DB
        db.table("shops").update(
            {
                "community_summary": result.summary_zh_tw,
                "review_topics": [topic.model_dump() for topic in result.review_topics],
                "community_summary_updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", shop_id).execute()
        await log_job_event(
            db,
            job_id,
            "info",
            "db.write",
            table="shops",
            columns=["community_summary"],
        )

        logger.info(
            "Community summary generated",
            shop_id=shop_id,
            summary_length=len(result.summary_zh_tw),
            review_count=len(google_reviews) + len(checkin_texts),
        )

        # Chain to embedding generation
        await queue.enqueue(
            job_type=JobType.GENERATE_EMBEDDING,
            payload={"shop_id": shop_id},
            priority=2,
        )

        await log_job_event(db, job_id, "info", "job.end", status="ok")

    except Exception as exc:
        await log_job_event(db, job_id, "error", "job.error", error=str(exc))
        raise
