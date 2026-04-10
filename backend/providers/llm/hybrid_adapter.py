"""HybridLLMAdapter composes two LLMProvider adapters and routes each method to the
most cost-effective provider. Keeps enrich_shop on Claude Sonnet 4.6 (quality gate, see
ADR 2026-02-24) and routes the other four methods to OpenAI.

See docs/decisions/2026-04-10-hybrid-llm-routing.md for full rationale.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.types import (
        EnrichmentResult,
        MenuExtractionResult,
        PhotoCategory,
        ReviewSummaryResult,
        ShopEnrichmentInput,
        TarotEnrichmentResult,
    )
    from providers.llm.interface import LLMProvider


class HybridLLMAdapter:
    def __init__(self, *, anthropic: LLMProvider, openai: LLMProvider) -> None:
        self._anthropic = anthropic
        self._openai = openai

    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult:
        return await self._anthropic.enrich_shop(shop)

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult:
        return await self._openai.extract_menu_data(image_url)

    async def classify_photo(self, image_url: str) -> PhotoCategory:
        return await self._openai.classify_photo(image_url)

    async def summarize_reviews(
        self,
        google_reviews: list[str],
        checkin_texts: list[str],
    ) -> ReviewSummaryResult:
        return await self._openai.summarize_reviews(
            google_reviews=google_reviews,
            checkin_texts=checkin_texts,
        )

    async def assign_tarot(self, shop: ShopEnrichmentInput) -> TarotEnrichmentResult:
        return await self._openai.assign_tarot(shop)
