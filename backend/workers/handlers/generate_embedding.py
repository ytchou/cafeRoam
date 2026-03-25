from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from models.types import CHECKIN_MIN_TEXT_LENGTH, MAX_COMMUNITY_TEXTS, JobType
from providers.embeddings.interface import EmbeddingsProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_generate_embedding(
    payload: dict[str, Any],
    db: Client,
    embeddings: EmbeddingsProvider,
    queue: JobQueue,
) -> None:
    """Generate vector embedding for a shop, enriched with menu items and community texts.

    Safe for re-embedding already-live shops: when processing_status is 'live',
    only the embedding column is updated — no status transition, no PUBLISH_SHOP job.
    This prevents live shops from temporarily disappearing from search during re-embedding.
    """
    shop_id = payload["shop_id"]
    logger.info("Generating embedding", shop_id=shop_id)

    # Load shop data including processing_status for the live-shop guard
    response = (
        db.table("shops")
        .select("name, description, processing_status, community_summary")
        .eq("id", shop_id)
        .single()
        .execute()
    )
    shop = cast("dict[str, Any]", response.data)
    if not shop:
        logger.error("Shop not found — skipping embedding", shop_id=shop_id)
        return

    # Load menu items if available
    menu_response = db.table("shop_menu_items").select("item_name").eq("shop_id", shop_id).execute()
    menu_rows = cast("list[dict[str, Any]]", menu_response.data or [])
    item_names = [row["item_name"] for row in menu_rows if row.get("item_name")]

    # Load community check-in texts — only needed when no stored summary exists (fallback path)
    community_block = shop.get("community_summary")
    if not community_block:
        community_response = db.rpc(
            "get_ranked_checkin_texts",
            {
                "p_shop_id": shop_id,
                "p_min_length": CHECKIN_MIN_TEXT_LENGTH,
                "p_limit": MAX_COMMUNITY_TEXTS,
            },
        ).execute()
        community_rows = cast("list[dict[str, Any]]", community_response.data or [])
        community_texts = [row["text"] for row in community_rows if row.get("text")]
        if community_texts:
            community_block = ". ".join(community_texts)
    else:
        community_texts = []

    # Build embedding text: base | menu items || community block
    base_text = f"{shop['name']}. {shop.get('description') or ''}"
    text = f"{base_text} | {', '.join(item_names)}" if item_names else base_text
    if community_block:
        text = f"{text} || {community_block}"

    # Warn if community text is unusually large (design budget: ~1300 tokens total).
    # OpenAI text-embedding-3-small supports 8191 tokens; ~4 chars/token as a rough heuristic.
    if len(text) > 6000:
        logger.warning(
            "Embedding text exceeds expected budget — may approach token limit",
            shop_id=shop_id,
            text_length=len(text),
        )

    # Generate embedding
    embedding = await embeddings.embed(text)

    # Live-shop guard: only advance status for shops in the pre-live pipeline stages.
    # Shops already 'live' or 'publishing' must NOT advance — doing so would re-trigger
    # PUBLISH_SHOP and could briefly remove a live shop from search results.
    should_advance = shop.get("processing_status") in {"embedding", "enriched"}

    update_data: dict[str, Any] = {
        "embedding": embedding,
        "last_embedded_at": datetime.now(UTC).isoformat(),
    }
    if should_advance:
        update_data["processing_status"] = "publishing"

    db.table("shops").update(update_data).eq("id", shop_id).execute()

    logger.info(
        "Embedding generated",
        shop_id=shop_id,
        dimensions=len(embedding),
        menu_items=len(item_names),
        community_texts=len(community_texts),
        should_advance=should_advance,
    )

    if should_advance:
        publish_payload: dict[str, Any] = {"shop_id": shop_id}
        for key in ("submission_id", "submitted_by", "batch_id"):
            if payload.get(key):
                publish_payload[key] = payload[key]

        await queue.enqueue(
            job_type=JobType.PUBLISH_SHOP,
            payload=publish_payload,
            priority=5,
        )
