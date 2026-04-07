from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from core.lang import is_zh_dominant
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

    shop_response = (
        db.table("shops")
        .select(
            "id, name, description, categories, price_range, "
            "socket, limited_time, rating, review_count"
        )
        .eq("id", shop_id)
        .single()
        .execute()
    )
    shop = cast("dict[str, Any]", shop_response.data)

    reviews_response = db.table("shop_reviews").select("text").eq("shop_id", shop_id).execute()
    review_rows = cast("list[dict[str, Any]]", reviews_response.data)
    reviews = [r["text"] for r in review_rows if r.get("text")]

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
        google_maps_features=payload.get("google_maps_features", {}),
    )

    result = await llm.enrich_shop(enrichment_input)

    if result.summary and not is_zh_dominant(result.summary):
        logger.warning(
            "Enrichment summary is not zh-TW dominant — marking failed",
            shop_id=shop_id,
            summary_preview=result.summary[:80],
        )
        db.table("shops").update(
            {"processing_status": "failed", "updated_at": datetime.now(UTC).isoformat()}
        ).eq("id", shop_id).execute()
        raise ValueError(f"Enrichment summary for shop {shop_id} is not in Traditional Chinese")

    mode = result.mode_scores
    db.table("shops").update(
        {
            "description": result.summary,
            "enriched_at": datetime.now(UTC).isoformat(),
            "mode_work": mode.work if mode else None,
            "mode_rest": mode.rest if mode else None,
            "mode_social": mode.social if mode else None,
            "processing_status": "embedding",
            "menu_highlights": result.menu_highlights,
            "coffee_origins": result.coffee_origins,
        }
    ).eq("id", shop_id).execute()

    # Re-enrichment replaces tags, not appends
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

    try:
        tarot = await llm.assign_tarot(enrichment_input)
        if tarot.tarot_title:
            db.table("shops").update(
                {
                    "tarot_title": tarot.tarot_title,
                    "flavor_text": tarot.flavor_text,
                }
            ).eq("id", shop_id).execute()
            logger.info("Tarot assigned", shop_id=shop_id, title=tarot.tarot_title)
    except Exception:
        logger.warning("Tarot enrichment failed — continuing", shop_id=shop_id, exc_info=True)

    enqueue_payload: dict[str, Any] = {"shop_id": shop_id}
    for key in ("submission_id", "submitted_by", "batch_id"):
        if payload.get(key):
            enqueue_payload[key] = payload[key]

    await queue.enqueue(
        job_type=JobType.GENERATE_EMBEDDING,
        payload=enqueue_payload,
        priority=5,
    )

    logger.info("Shop enriched", shop_id=shop_id, tag_count=len(result.tags))
