"""Tests for HybridLLMAdapter — verifies per-method routing to anthropic vs openai."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import (
    EnrichmentResult,
    MenuExtractionResult,
    PhotoCategory,
    ReviewSummaryResult,
    ReviewTopic,
    ShopEnrichmentInput,
    TarotEnrichmentResult,
)
from providers.llm.hybrid_adapter import HybridLLMAdapter


@pytest.fixture
def anthropic_mock():
    mock = MagicMock()
    mock.enrich_shop = AsyncMock(
        return_value=EnrichmentResult(
            tags=[],
            summary="A quiet specialty cafe in Da'an District.",
            confidence=0.92,
        )
    )
    mock.extract_menu_data = AsyncMock(return_value=MenuExtractionResult(items=[]))
    mock.classify_photo = AsyncMock(return_value=PhotoCategory.VIBE)
    mock.summarize_reviews = AsyncMock(
        return_value=ReviewSummaryResult(
            summary_zh_tw="安靜的工作空間，適合深度工作。",
            review_topics=[ReviewTopic(topic="安靜", count=5)],
        )
    )
    mock.assign_tarot = AsyncMock(
        return_value=TarotEnrichmentResult(
            tarot_title="The Hermit",
            flavor_text="A sanctuary for solitary thinkers.",
        )
    )
    return mock


@pytest.fixture
def openai_mock():
    mock = MagicMock()
    mock.enrich_shop = AsyncMock(
        return_value=EnrichmentResult(
            tags=[],
            summary="OpenAI enriched.",
            confidence=0.70,
        )
    )
    mock.extract_menu_data = AsyncMock(
        return_value=MenuExtractionResult(items=[{"name": "Latte", "price": 150}])
    )
    mock.classify_photo = AsyncMock(return_value=PhotoCategory.MENU)
    mock.summarize_reviews = AsyncMock(
        return_value=ReviewSummaryResult(
            summary_zh_tw="咖啡不錯，員工友善。",
            review_topics=[ReviewTopic(topic="友善服務", count=3)],
        )
    )
    mock.assign_tarot = AsyncMock(
        return_value=TarotEnrichmentResult(
            tarot_title="The Star",
            flavor_text="A beacon of creativity.",
        )
    )
    return mock


@pytest.fixture
def hybrid(anthropic_mock, openai_mock):
    return HybridLLMAdapter(anthropic=anthropic_mock, openai=openai_mock)


@pytest.fixture
def shop():
    return ShopEnrichmentInput(
        name="Fika Coffee",
        reviews=["Great coffee!", "Quiet atmosphere, perfect for working."],
        description="Specialty cafe in Da'an District.",
    )


@pytest.mark.asyncio
async def test_enrich_shop_goes_to_anthropic(hybrid, anthropic_mock, openai_mock, shop):
    result = await hybrid.enrich_shop(shop)
    anthropic_mock.enrich_shop.assert_called_once_with(shop)
    openai_mock.enrich_shop.assert_not_called()
    assert result.confidence == 0.92


@pytest.mark.asyncio
async def test_extract_menu_data_goes_to_openai(hybrid, anthropic_mock, openai_mock):
    image_url = "https://storage.example.com/menu.jpg"
    result = await hybrid.extract_menu_data(image_url)
    openai_mock.extract_menu_data.assert_called_once_with(image_url)
    anthropic_mock.extract_menu_data.assert_not_called()
    assert result is not None


@pytest.mark.asyncio
async def test_classify_photo_goes_to_openai(hybrid, anthropic_mock, openai_mock):
    image_url = "https://storage.example.com/photo.jpg"
    result = await hybrid.classify_photo(image_url)
    openai_mock.classify_photo.assert_called_once_with(image_url)
    anthropic_mock.classify_photo.assert_not_called()
    assert result == PhotoCategory.MENU


@pytest.mark.asyncio
async def test_summarize_reviews_goes_to_openai(hybrid, anthropic_mock, openai_mock):
    google_reviews = ["Great coffee!", "Nice atmosphere for working."]
    checkin_texts = ["手沖很棒", "適合工作"]
    result = await hybrid.summarize_reviews(
        google_reviews=google_reviews,
        checkin_texts=checkin_texts,
    )
    openai_mock.summarize_reviews.assert_called_once_with(
        google_reviews=google_reviews,
        checkin_texts=checkin_texts,
    )
    anthropic_mock.summarize_reviews.assert_not_called()
    assert isinstance(result, ReviewSummaryResult)


@pytest.mark.asyncio
async def test_assign_tarot_goes_to_openai(hybrid, anthropic_mock, openai_mock, shop):
    result = await hybrid.assign_tarot(shop)
    openai_mock.assign_tarot.assert_called_once_with(shop)
    anthropic_mock.assign_tarot.assert_not_called()
    assert result.tarot_title == "The Star"
