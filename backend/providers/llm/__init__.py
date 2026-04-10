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
                classify_model=settings.anthropic_classify_model,
                taxonomy=taxonomy or [],
            )
        case "hybrid":
            from providers.llm.anthropic_adapter import AnthropicLLMAdapter
            from providers.llm.hybrid_adapter import HybridLLMAdapter
            from providers.llm.openai_adapter import OpenAILLMAdapter

            return HybridLLMAdapter(
                anthropic=AnthropicLLMAdapter(
                    api_key=settings.anthropic_api_key,
                    model=settings.anthropic_model,
                    classify_model=settings.anthropic_classify_model,
                    taxonomy=taxonomy or [],
                ),
                openai=OpenAILLMAdapter(
                    api_key=settings.openai_api_key,
                    model=settings.openai_llm_model,
                    classify_model=settings.openai_llm_classify_model,
                    nano_model=settings.openai_llm_nano_model,
                    taxonomy=taxonomy or [],
                ),
            )
        case _:
            raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
