from core.config import settings
from providers.embeddings.interface import EmbeddingsProvider


def get_embeddings_provider() -> EmbeddingsProvider:
    match settings.embeddings_provider:
        case "openai":
            from providers.embeddings.openai_adapter import OpenAIEmbeddingsAdapter

            return OpenAIEmbeddingsAdapter(
                api_key=settings.openai_api_key,
                model=settings.openai_embedding_model,
            )
        case _:
            raise ValueError(
                f"Unknown embeddings provider: {settings.embeddings_provider}"
            )
