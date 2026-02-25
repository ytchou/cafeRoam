from typing import Any, cast

import structlog
from supabase import Client

from providers.embeddings.interface import EmbeddingsProvider

logger = structlog.get_logger()


async def handle_generate_embedding(
    payload: dict[str, Any],
    db: Client,
    embeddings: EmbeddingsProvider,
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

    # Store embedding
    db.table("shops").update(
        {
            "embedding": embedding,
        }
    ).eq("id", shop_id).execute()

    logger.info("Embedding generated", shop_id=shop_id, dimensions=len(embedding))
