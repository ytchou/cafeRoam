import structlog

from models.types import JobType
from providers.llm.interface import LLMProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_enrich_shop(
    payload: dict,
    db,
    llm: LLMProvider,
    queue: JobQueue,
) -> None:
    """Enrich a shop with AI-generated tags and summary."""
    shop_id = payload["shop_id"]
    logger.info("Enriching shop", shop_id=shop_id)

    # Load shop data
    shop = db.table("shops").select("*").eq("id", shop_id).single().execute().data

    # Load reviews
    reviews_response = db.table("shop_reviews").select("text").eq("shop_id", shop_id).execute()
    reviews = [r["text"] for r in reviews_response.data if r.get("text")]

    # Call LLM for enrichment
    result = await llm.enrich_shop(
        name=shop["name"],
        reviews=reviews,
        description=shop.get("description"),
        categories=[],
    )

    # Write enrichment result
    db.table("shops").update({
        "description": result.summary,
        "enriched_at": "now()",
    }).eq("id", shop_id).execute()

    # Queue embedding generation
    await queue.enqueue(
        job_type=JobType.GENERATE_EMBEDDING,
        payload={"shop_id": shop_id},
        priority=5,
    )

    logger.info("Shop enriched", shop_id=shop_id, tag_count=len(result.tags))
