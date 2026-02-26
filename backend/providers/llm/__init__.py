from core.config import settings
from models.types import TaxonomyTag
from providers.llm.interface import LLMProvider


def get_llm_provider(taxonomy: list[TaxonomyTag] | None = None) -> LLMProvider:
    match settings.llm_provider:
        case "anthropic":
            from providers.llm.anthropic_adapter import AnthropicLLMAdapter

            return AnthropicLLMAdapter(
                api_key=settings.anthropic_api_key,
                model=settings.anthropic_model,
                taxonomy=taxonomy or [],
            )
        case _:
            raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
