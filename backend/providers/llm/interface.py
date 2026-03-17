from typing import Protocol

from models.types import EnrichmentResult, MenuExtractionResult, ShopEnrichmentInput, TarotEnrichmentResult


class LLMProvider(Protocol):
    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult: ...

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult: ...

    async def assign_tarot(self, shop: ShopEnrichmentInput) -> TarotEnrichmentResult: ...
