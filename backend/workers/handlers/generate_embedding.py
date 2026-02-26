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
    """Generate vector embedding for a shop."""
    shop_id = payload["shop_id"]
    logger.info("Generating embedding", shop_id=shop_id)

    # Load shop data for embedding text
    response = db.table("shops").select("name, description").eq("id", shop_id).single().execute()
    shop = cast("dict[str, Any]", response.data)

    # Build embedding text
    text = f"{shop['name']}. {shop.get('description', '')}"

    # Generate embedding
    embedding = await embeddings.embed(text)

    # Store embedding and advance status
    db.table("shops").update(
        {
            "embedding": embedding,
            "processing_status": "publishing",
        }
    ).eq("id", shop_id).execute()

    logger.info("Embedding generated", shop_id=shop_id, dimensions=len(embedding))

    # Queue publish step — forward submission context
    publish_payload: dict[str, Any] = {"shop_id": shop_id}
    if payload.get("submission_id"):
        publish_payload["submission_id"] = payload["submission_id"]
    if payload.get("submitted_by"):
        publish_payload["submitted_by"] = payload["submitted_by"]

    await queue.enqueue(
        job_type=JobType.PUBLISH_SHOP,
        payload=publish_payload,
        priority=5,
    )
