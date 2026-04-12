"""Unit tests for OpenAILLMAdapter.

Mocks are at the AsyncOpenAI SDK boundary only. All 5 protocol methods are covered,
plus error paths (missing tool_call, malformed JSON arguments, title not in whitelist).
"""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import (
    PhotoCategory,
    ReviewSummaryResult,
    ShopEnrichmentInput,
    TaxonomyTag,
)
from providers.llm.openai_adapter import OpenAILLMAdapter


@pytest.fixture
def taxonomy() -> list[TaxonomyTag]:
    return [
        TaxonomyTag(id="quiet", dimension="ambience", label="quiet", label_zh="安靜"),
        TaxonomyTag(
            id="laptop_friendly",
            dimension="functionality",
            label="laptop friendly",
            label_zh="筆電友善",
        ),
        TaxonomyTag(
            id="wifi_available", dimension="functionality", label="wifi", label_zh="有 Wi-Fi"
        ),
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
                "tags": [
                    {"id": "quiet", "confidence": 0.9},
                    {"id": "laptop_friendly", "confidence": 0.8},
                ],
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


async def test_extract_menu_data_returns_items(adapter):
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "extract_menu",
            {
                "items": [
                    {"name": "美式咖啡", "price": 120, "category": "coffee"},
                    {"name": "拿鐵", "price": 140, "category": "coffee"},
                ],
                "raw_text": "美式 120\n拿鐵 140",
            },
        )
    )

    result = await adapter.extract_menu_data("https://cdn.example.com/menu.jpg")

    assert len(result.items) == 2
    assert result.items[0]["name"] == "美式咖啡"
    assert result.raw_text.startswith("美式")
    # Verify the call used classify_model and passed the image URL in OpenAI format
    call = adapter._client.chat.completions.create.await_args
    assert call.kwargs["model"] == "gpt-5.4-mini"
    user_content = call.kwargs["messages"][-1]["content"]
    assert any(
        block.get("type") == "image_url"
        and block["image_url"]["url"] == "https://cdn.example.com/menu.jpg"
        for block in user_content
    )


async def test_extract_menu_data_returns_empty_when_no_items(adapter):
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response("extract_menu", {"items": [], "raw_text": ""})
    )

    result = await adapter.extract_menu_data("https://cdn.example.com/blank.jpg")
    assert result.items == []


@pytest.mark.parametrize(
    "category_value,expected",
    [
        ("MENU", PhotoCategory.MENU),
        ("VIBE", PhotoCategory.VIBE),
        ("SKIP", PhotoCategory.SKIP),
    ],
)
async def test_classify_photo_returns_enum(adapter, category_value, expected):
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response("classify_photo", {"category": category_value})
    )

    result = await adapter.classify_photo("https://cdn.example.com/photo_w400.jpg")
    assert result == expected


async def test_summarize_reviews_returns_structured_result(adapter):
    """summarize_reviews now uses tool calling and returns ReviewSummaryResult."""
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "summarize_reviews",
            {
                "summary_zh_tw": "這家咖啡店以手沖與安靜氛圍著稱。",
                "review_topics": [{"topic": "手沖", "count": 5}, {"topic": "安靜", "count": 3}],
            },
        )
    )

    result = await adapter.summarize_reviews(
        google_reviews=["好喝", "很安靜", "手沖很棒"],
        checkin_texts=[],
    )
    assert isinstance(result, ReviewSummaryResult)
    assert "手沖" in result.summary_zh_tw
    # Verify system prompt was included and classify_model was used
    call = adapter._client.chat.completions.create.await_args
    assert call.kwargs["model"] == "gpt-5.4-mini"
    assert call.kwargs["messages"][0]["role"] == "system"


async def test_summarize_reviews_blended_includes_community_section(adapter):
    """When checkin_texts present, the user message contains community notes section."""
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "summarize_reviews",
            {
                "summary_zh_tw": "社群推薦的安靜咖啡廳。",
                "review_topics": [{"topic": "安靜", "count": 4}],
            },
        )
    )

    await adapter.summarize_reviews(
        google_reviews=["ok coffee"],
        checkin_texts=["很安靜，適合工作"],
    )

    call = adapter._client.chat.completions.create.await_args
    user_msg = call.kwargs["messages"][1]["content"]
    assert "社群筆記" in user_msg
    assert "Google 評論" in user_msg


async def test_assign_tarot_returns_whitelisted_title(adapter, enrich_input):
    from core.tarot_vocabulary import TAROT_TITLES

    valid_title = TAROT_TITLES[0]
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "assign_tarot",
            {"tarot_title": valid_title, "flavor_text": "A quiet refuge for late-night writers."},
        )
    )

    result = await adapter.assign_tarot(enrich_input)
    assert result.tarot_title == valid_title
    assert "refuge" in result.flavor_text.lower()
    # Verify nano model was used
    call = adapter._client.chat.completions.create.await_args
    assert call.kwargs["model"] == "gpt-5.4-nano"


async def test_assign_tarot_drops_title_not_in_whitelist(adapter, enrich_input):
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "assign_tarot",
            {"tarot_title": "Not A Real Title", "flavor_text": "..."},
        )
    )

    result = await adapter.assign_tarot(enrich_input)
    assert result.tarot_title is None  # scrubbed — not in whitelist
    assert result.flavor_text == "..."


async def test_openai_summarize_reviews_returns_structured_result(adapter):
    """With Google reviews, summarize_reviews returns a ReviewSummaryResult."""
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "summarize_reviews",
            {
                "summary_zh_tw": "咖啡很棒",
                "review_topics": [{"topic": "手沖", "count": 6}],
            },
        )
    )

    result = await adapter.summarize_reviews(
        google_reviews=["Great coffee"],
        checkin_texts=[],
    )

    assert isinstance(result, ReviewSummaryResult)
    assert result.summary_zh_tw == "咖啡很棒"
    assert result.review_topics[0].topic == "手沖"


async def test_openai_summarize_reviews_uses_function_calling(adapter):
    """Verifies tool_choice with summarize_reviews function name is passed correctly."""
    adapter._client = AsyncMock()
    adapter._client.chat.completions.create = AsyncMock(
        return_value=_openai_tool_call_response(
            "summarize_reviews",
            {"summary_zh_tw": "test", "review_topics": [{"topic": "x", "count": 1}]},
        )
    )

    await adapter.summarize_reviews(google_reviews=["r"], checkin_texts=[])

    call_kwargs = adapter._client.chat.completions.create.call_args[1]
    assert call_kwargs["tool_choice"]["function"]["name"] == "summarize_reviews"


class TestOpenAIUsageLogging:
    async def test_enrich_shop_logs_api_usage(self, adapter):
        """After enrich_shop() succeeds, api_usage_log is inserted with provider=openai."""
        from unittest.mock import patch
        from models.types import ShopEnrichmentInput

        shop = ShopEnrichmentInput(
            name='光景咖啡',
            reviews=['手沖咖啡超棒', '環境很安靜'],
            description='A specialty coffee shop in Taipei',
            categories=['咖啡廳'],
            price_range='$150-350',
            socket='yes',
            limited_time='no',
            rating=4.7,
            review_count=25,
        )

        mock_response = MagicMock()
        mock_response.usage = MagicMock()
        mock_response.usage.prompt_tokens = 600
        mock_response.usage.completion_tokens = 120
        mock_choice = MagicMock()
        mock_tool_call = MagicMock()
        mock_tool_call.function.arguments = json.dumps({
            'tags': [{'id': 'quiet', 'confidence': 0.9}],
            'summary': 'A quiet specialty cafe.',
            'mode': 'work',
        })
        mock_choice.message.tool_calls = [mock_tool_call]
        mock_response.choices = [mock_choice]

        adapter._client = AsyncMock()
        adapter._client.chat.completions.create = AsyncMock(return_value=mock_response)

        with patch('providers.llm.openai_adapter.log_api_usage') as mock_log:
            await adapter.enrich_shop(shop)

        mock_log.assert_called_once()
        call_kwargs = mock_log.call_args.kwargs
        assert call_kwargs['provider'] == 'openai'
        assert call_kwargs['task'] == 'enrich_shop'
        assert call_kwargs['tokens_input'] == 600
        assert call_kwargs['tokens_output'] == 120
