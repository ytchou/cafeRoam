from anthropic import AsyncAnthropic

from models.types import EnrichmentResult, MenuExtractionResult


class AnthropicLLMAdapter:
    def __init__(self, api_key: str, model: str):
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def enrich_shop(
        self,
        name: str,
        reviews: list[str],
        description: str | None,
        categories: list[str],
    ) -> EnrichmentResult:
        raise NotImplementedError("Enrich shop not yet implemented")

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult:
        raise NotImplementedError("Menu extraction not yet implemented")
