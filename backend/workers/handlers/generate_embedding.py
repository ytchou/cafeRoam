from typing import Any, cast

import structlog
from supabase import Client

from models.types import JobType
from providers.embeddings.interface import EmbeddingsProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_generate_embedding(
    payload: dict[str, Any],
    db: Client,
    embeddings: EmbeddingsProvider,
    queue: JobQueue,
) -> None:
    """Generate vector embedding for a shop, enriched with menu items if available.

    Safe for re-embedding already-live shops: when processing_status is 'live',
    only the embedding column is updated — no status transition, no PUBLISH_SHOP job.
    This prevents live shops from temporarily disappearing from search during re-embedding.
    """
    shop_id = payload["shop_id"]
    logger.info("Generating embedding", shop_id=shop_id)

    # Load shop data including processing_status for the live-shop guard
    response = (
        db.table("shops")
        .select("name, description, processing_status")
        .eq("id", shop_id)
        .single()
        .execute()
    )
    shop = cast("dict[str, Any]", response.data)

    # Load menu items if available
    menu_response = (
        db.table("shop_menu_items").select("item_name").eq("shop_id", shop_id).execute()
    )
    menu_rows = cast("list[dict[str, Any]]", menu_response.data or [])
    item_names = [row["item_name"] for row in menu_rows if row.get("item_name")]

    # Build embedding text: append menu items after ' | ' if present
    base_text = f"{shop['name']}. {shop.get('description', '')}"
    text = f"{base_text} | {', '.join(item_names)}" if item_names else base_text

    # Generate embedding
    embedding = await embeddings.embed(text)

    # Live-shop guard: already-live shops get only the embedding updated in-place.
    # New shops advance through the pipeline as before.
    is_live = shop.get("processing_status") == "live"

    update_data: dict[str, Any] = {"embedding": embedding}
    if not is_live:
        update_data["processing_status"] = "publishing"

    db.table("shops").update(update_data).eq("id", shop_id).execute()

    logger.info(
        "Embedding generated",
        shop_id=shop_id,
        dimensions=len(embedding),
        menu_items=len(item_names),
        is_live=is_live,
    )

    if not is_live:
        publish_payload: dict[str, Any] = {"shop_id": shop_id}
        for key in ("submission_id", "submitted_by", "batch_id"):
            if payload.get(key):
                publish_payload[key] = payload[key]

        await queue.enqueue(
            job_type=JobType.PUBLISH_SHOP,
            payload=publish_payload,
            priority=5,
        )
