from typing import Protocol

from models.types import (
    EnrichmentResult,
    MenuExtractionResult,
    PhotoCategory,
    ShopEnrichmentInput,
    TarotEnrichmentResult,
)


class LLMProvider(Protocol):
    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult: ...

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult: ...

    async def assign_tarot(self, shop: ShopEnrichmentInput) -> TarotEnrichmentResult: ...

    async def classify_photo(self, image_url: str) -> PhotoCategory: ...

    async def summarize_reviews(self, texts: list[str]) -> str: ...
