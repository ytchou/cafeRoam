from core.config import settings
from providers.embeddings.interface import EmbeddingsProvider


class EmbeddingsProviderUnavailableError(Exception):
    """Raised when the embeddings provider cannot be initialized (e.g. missing API key)."""


def get_embeddings_provider() -> EmbeddingsProvider:
    match settings.embeddings_provider:
        case "openai":
            if not settings.openai_api_key:
                raise EmbeddingsProviderUnavailableError(
                    "OPENAI_API_KEY is not set. Add it to backend/.env to enable semantic search."
                )
            from providers.embeddings.openai_adapter import OpenAIEmbeddingsAdapter

            return OpenAIEmbeddingsAdapter(
                api_key=settings.openai_api_key,
                model=settings.openai_embedding_model,
            )
        case _:
            raise ValueError(f"Unknown embeddings provider: {settings.embeddings_provider}")
