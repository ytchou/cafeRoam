from typing import Protocol

from models.types import EnrichmentResult, MenuExtractionResult


class LLMProvider(Protocol):
    async def enrich_shop(
        self,
        name: str,
        reviews: list[str],
        description: str | None,
        categories: list[str],
    ) -> EnrichmentResult: ...

    async def extract_menu_data(
        self,
        image_url: str,
    ) -> MenuExtractionResult: ...
