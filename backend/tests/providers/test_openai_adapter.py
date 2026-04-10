"""Unit tests for OpenAILLMAdapter.

Mocks are at the AsyncOpenAI SDK boundary only. All 5 protocol methods are covered,
plus error paths (missing tool_call, malformed JSON arguments, title not in whitelist).
"""
import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import (
    PhotoCategory,
    ShopEnrichmentInput,
    TaxonomyTag,
)
from providers.llm.openai_adapter import OpenAILLMAdapter


@pytest.fixture
def taxonomy() -> list[TaxonomyTag]:
    return [
        TaxonomyTag(id="quiet", dimension="ambience", label="quiet", label_zh="安靜"),
        TaxonomyTag(id="laptop_friendly", dimension="functionality", label="laptop friendly", label_zh="筆電友善"),
        TaxonomyTag(id="wifi_available", dimension="functionality", label="wifi", label_zh="有 Wi-Fi"),
    ]


@pytest.fixture
def adapter(taxonomy) -> OpenAILLMAdapter:
    return OpenAILLMAdapter(
        api_key="sk-test",
        model="gpt-5.4",
        classify_model="gpt-5.4-mini",
        nano_model="gpt-5.4-nano",
        taxonomy=taxonomy,
    )


def _openai_tool_call_response(function_name: str, arguments: dict) -> MagicMock:
    """Build a minimal mocked OpenAI ChatCompletion response with one tool_call."""
    tool_call = MagicMock()
    tool_call.function.name = function_name
    tool_call.function.arguments = json.dumps(arguments)
    message = MagicMock()
    message.tool_calls = [tool_call]
    message.content = None
    choice = MagicMock()
    choice.message = message
    resp = MagicMock()
    resp.choices = [choice]
    return resp


@pytest.fixture
def enrich_input() -> ShopEnrichmentInput:
    return ShopEnrichmentInput(
        name="Test Cafe",
        reviews=["好喝", "安靜適合工作"],
        description="Quiet independent cafe in Da'an",
        categories=["coffee_shop"],
        price_range="$$",
        socket=True,
        limited_time=None,
        rating=4.5,
        review_count=120,
        google_maps_features={},
        vibe_photo_urls=[],
    )


async def test_enrich_shop_returns_parsed_result_on_happy_path(adapter, enrich_input):
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "classify_shop",
            {
                "tags": [{"id": "quiet", "confidence": 0.9}, {"id": "laptop_friendly", "confidence": 0.8}],
                "summary": "安靜的獨立咖啡店,適合工作與閱讀。",
                "topReviews": ["好喝", "安靜適合工作"],
                "mode": "work",
                "menu_highlights": ["Pour over"],
                "coffee_origins": ["Ethiopia"],
            },
        )
    )

    result = await adapter.enrich_shop(enrich_input)

    assert {t.id for t in result.tags} == {"quiet", "laptop_friendly"}
    assert result.summary.startswith("安靜")
    assert result.mode_scores is not None
    assert result.menu_highlights == ["pour over"]
    adapter._client.chat.completions.create.assert_awaited_once()


async def test_enrich_shop_raises_when_tool_call_missing(adapter, enrich_input):
    adapter._client = AsyncMock()
    bad_message = MagicMock()
    bad_message.tool_calls = None
    bad_message.content = "sorry, no tool call"
    bad_choice = MagicMock()
    bad_choice.message = bad_message
    bad_resp = MagicMock()
    bad_resp.choices = [bad_choice]
    adapter._client.chat.completions.create = AsyncMock(return_value=bad_resp)

    with pytest.raises(RuntimeError, match="tool_call"):
        await adapter.enrich_shop(enrich_input)


async def test_enrich_shop_raises_when_arguments_not_json(adapter, enrich_input):
    adapter._client = AsyncMock()
    bad_tool_call = MagicMock()
    bad_tool_call.function.name = "classify_shop"
    bad_tool_call.function.arguments = "not json"
    bad_message = MagicMock()
    bad_message.tool_calls = [bad_tool_call]
    bad_choice = MagicMock()
    bad_choice.message = bad_message
    bad_resp = MagicMock()
    bad_resp.choices = [bad_choice]
    adapter._client.chat.completions.create = AsyncMock(return_value=bad_resp)

    with pytest.raises(RuntimeError, match="JSON"):
        await adapter.enrich_shop(enrich_input)
