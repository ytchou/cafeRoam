from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from models.types import JobType, ShopEnrichmentInput
from providers.llm.interface import LLMProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_enrich_shop(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
) -> None:
    """Enrich a shop with AI-generated tags and summary."""
    shop_id = payload["shop_id"]
    logger.info("Enriching shop", shop_id=shop_id)

    # Load shop data
    shop_response = db.table("shops").select("*").eq("id", shop_id).single().execute()
    shop = cast("dict[str, Any]", shop_response.data)

    # Load reviews
    reviews_response = db.table("shop_reviews").select("text").eq("shop_id", shop_id).execute()
    review_rows = cast("list[dict[str, Any]]", reviews_response.data)
    reviews = [r["text"] for r in review_rows if r.get("text")]

    # Build enrichment input
    enrichment_input = ShopEnrichmentInput(
        name=shop["name"],
        reviews=reviews,
        description=shop.get("description"),
        categories=shop.get("categories", []),
        price_range=shop.get("price_range"),
        socket=shop.get("socket"),
        limited_time=shop.get("limited_time"),
        rating=shop.get("rating"),
        review_count=shop.get("review_count"),
    )

    # Call LLM for enrichment
    result = await llm.enrich_shop(enrichment_input)

    # Write enrichment result — mode scores and summary to shops table
    mode = result.mode_scores
    db.table("shops").update(
        {
            "description": result.summary,
            "enriched_at": datetime.now(UTC).isoformat(),
            "mode_work": mode.work if mode else None,
            "mode_rest": mode.rest if mode else None,
            "mode_social": mode.social if mode else None,
            "processing_status": "embedding",
        }
    ).eq("id", shop_id).execute()

    # Replace tags: delete old, then insert new (re-enrichment replaces, not appends)
    db.table("shop_tags").delete().eq("shop_id", shop_id).execute()
    if result.tags:
        tag_rows = [
            {
                "shop_id": shop_id,
                "tag_id": tag.id,
                "confidence": result.tag_confidences.get(tag.id, 0.0),
            }
            for tag in result.tags
        ]
        db.table("shop_tags").insert(tag_rows).execute()

    # Queue embedding generation — forward submission context
    enqueue_payload: dict[str, Any] = {"shop_id": shop_id}
    if payload.get("submission_id"):
        enqueue_payload["submission_id"] = payload["submission_id"]
    if payload.get("submitted_by"):
        enqueue_payload["submitted_by"] = payload["submitted_by"]

    await queue.enqueue(
        job_type=JobType.GENERATE_EMBEDDING,
        payload=enqueue_payload,
        priority=5,
    )

    logger.info("Shop enriched", shop_id=shop_id, tag_count=len(result.tags))
