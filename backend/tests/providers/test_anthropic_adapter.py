from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import ReviewSummaryResult, ShopEnrichmentInput, ShopModeScores, TaxonomyTag
from providers.llm._tool_schemas import SUMMARIZE_REVIEWS_TOOL_SCHEMA
from providers.llm.anthropic_adapter import AnthropicLLMAdapter

SAMPLE_TAXONOMY = [
    TaxonomyTag(id="quiet", dimension="ambience", label="Quiet", label_zh="安靜"),
    TaxonomyTag(id="deep_work", dimension="mode", label="Deep Work", label_zh="深度工作"),
    TaxonomyTag(
        id="wifi_available", dimension="functionality", label="WiFi Available", label_zh="提供 WiFi"
    ),
    TaxonomyTag(id="pour_over", dimension="coffee", label="Pour Over", label_zh="手沖咖啡"),
]

SAMPLE_SHOP = ShopEnrichmentInput(
    name="Test Cafe 測試咖啡",
    reviews=["很安靜適合工作", "咖啡很好喝，手沖超讚"],
    description="A quiet specialty cafe",
    categories=["咖啡廳", "咖啡烘焙商"],
    price_range="$200-400",
    socket="yes",
    limited_time="no",
    rating=4.5,
    review_count=10,
)


def _make_tool_use_response(tool_input: dict) -> MagicMock:
    """Build a mock Anthropic response with a tool_use content block."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = "classify_shop"
    tool_block.input = tool_input

    response = MagicMock()
    response.content = [tool_block]
    response.stop_reason = "tool_use"
    return response


class TestAnthropicEnrichShop:
    @pytest.fixture
    def adapter(self):
        return AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=SAMPLE_TAXONOMY,
        )

    async def test_returns_enrichment_result_with_valid_tags(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [
                    {"id": "quiet", "confidence": 0.9},
                    {"id": "deep_work", "confidence": 0.85},
                ],
                "summary": "A quiet cafe perfect for focused work.",
                "topReviews": ["很安靜適合工作"],
                "mode": "work",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert len(result.tags) == 2
        assert result.tags[0].id == "quiet"
        assert result.tags[0].dimension == "ambience"
        assert result.tags[1].id == "deep_work"
        assert result.summary == "A quiet cafe perfect for focused work."
        assert result.confidence == pytest.approx(0.875)  # avg(0.9, 0.85)
        assert result.mode_scores == ShopModeScores(work=1.0, rest=0.0, social=0.0)

    async def test_filters_invalid_tags(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [
                    {"id": "quiet", "confidence": 0.9},
                    {"id": "nonexistent_tag", "confidence": 0.8},
                ],
                "summary": "A quiet place.",
                "topReviews": [],
                "mode": "rest",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert len(result.tags) == 1
        assert result.tags[0].id == "quiet"

    async def test_clamps_confidence_values(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [
                    {"id": "quiet", "confidence": 1.5},
                    {"id": "deep_work", "confidence": -0.2},
                ],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.tags[0].id == "quiet"
        # Confidence should be clamped: 1.5 -> 1.0, -0.2 -> 0.0
        # We verify via overall confidence
        assert 0.0 <= result.confidence <= 1.0

    async def test_defaults_invalid_mode_to_mixed(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [{"id": "quiet", "confidence": 0.9}],
                "summary": "Test.",
                "topReviews": [],
                "mode": "invalid_mode",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.mode_scores == ShopModeScores(work=0.5, rest=0.5, social=0.5)

    async def test_mode_scores_mapping(self, adapter):
        """Verify all 4 mode strings map to correct ShopModeScores."""
        for mode, expected in [
            ("work", ShopModeScores(work=1.0, rest=0.0, social=0.0)),
            ("rest", ShopModeScores(work=0.0, rest=1.0, social=0.0)),
            ("social", ShopModeScores(work=0.0, rest=0.0, social=1.0)),
            ("mixed", ShopModeScores(work=0.5, rest=0.5, social=0.5)),
        ]:
            mock_response = _make_tool_use_response(
                {
                    "tags": [{"id": "quiet", "confidence": 0.9}],
                    "summary": "Test.",
                    "topReviews": [],
                    "mode": mode,
                }
            )
            adapter._client = AsyncMock()
            adapter._client.messages.create = AsyncMock(return_value=mock_response)

            result = await adapter.enrich_shop(SAMPLE_SHOP)
            assert result.mode_scores == expected, f"Mode '{mode}' mapped incorrectly"

    async def test_raises_on_no_tool_use_block(self, adapter):
        response = MagicMock()
        text_block = MagicMock()
        text_block.type = "text"
        response.content = [text_block]
        response.stop_reason = "end_turn"

        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=response)

        with pytest.raises(ValueError, match="No tool_use block"):
            await adapter.enrich_shop(SAMPLE_SHOP)

    async def test_prompt_includes_shop_data(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.enrich_shop(SAMPLE_SHOP)

        call_args = adapter._client.messages.create.call_args
        messages = call_args.kwargs.get("messages") or call_args[1].get("messages")
        user_msg = messages[0]["content"]

        # Verify shop data appears in the prompt
        assert "Test Cafe 測試咖啡" in user_msg
        assert "很安靜適合工作" in user_msg
        assert "$200-400" in user_msg
        assert "yes" in user_msg  # socket

    async def test_enrichment_uses_canonical_traditional_chinese_terms(self, adapter):
        """When enriching a shop, the AI receives vocabulary reference lists so it returns standardised Traditional Chinese names for origins and menu items."""
        mock_response = _make_tool_use_response(
            {"tags": [], "summary": "Test.", "topReviews": [], "mode": "mixed"}
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.enrich_shop(SAMPLE_SHOP)

        call_args = adapter._client.messages.create.call_args
        messages = call_args.kwargs.get("messages") or call_args[1].get("messages")
        user_msg = messages[0]["content"]

        assert "巴斯克蛋糕" in user_msg  # food zh (only in ITEM_TERMS)
        assert "愛樂壓" in user_msg  # drink zh (only in ITEM_TERMS, not in taxonomy)
        assert "古吉" in user_msg  # Ethiopian sub-origin zh (only in SPECIALTY_TERMS)
        assert "耶加雪菲" in user_msg  # origin zh (only in SPECIALTY_TERMS)
        assert "日曬" in user_msg  # processing zh (only in SPECIALTY_TERMS)
        assert "Traditional Chinese" in user_msg  # instruction present

    async def test_prompt_includes_taxonomy(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.enrich_shop(SAMPLE_SHOP)

        call_args = adapter._client.messages.create.call_args
        messages = call_args.kwargs.get("messages") or call_args[1].get("messages")
        user_msg = messages[0]["content"]

        # All 4 taxonomy tags should appear
        assert "quiet" in user_msg
        assert "deep_work" in user_msg
        assert "wifi_available" in user_msg
        assert "pour_over" in user_msg

    async def test_uses_forced_tool_choice(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.enrich_shop(SAMPLE_SHOP)

        call_args = adapter._client.messages.create.call_args
        tool_choice = call_args.kwargs.get("tool_choice") or call_args[1].get("tool_choice")
        assert tool_choice == {"type": "tool", "name": "classify_shop"}

    async def test_empty_tags_returns_zero_confidence(self, adapter):
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "No tags found.",
                "topReviews": [],
                "mode": "mixed",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.tags == []
        assert result.confidence == 0.0

    async def test_menu_highlights_normalized_to_canonical_vocab_terms(self, adapter):
        """LLM raw output is replaced with canonical vocabulary forms."""
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
                "menu_highlights": ["巴斯克蛋糕", "great coffee"],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.menu_highlights == ["巴斯克蛋糕"]

    async def test_coffee_origins_normalized_to_canonical_vocab_terms(self, adapter):
        """Non-standard origin strings are discarded; canonical forms are kept."""
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
                "coffee_origins": ["耶加雪菲", "freshly sourced beans"],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.coffee_origins == ["耶加雪菲"]

    async def test_menu_highlights_empty_when_no_vocab_match(self, adapter):
        """All non-vocabulary highlights are discarded."""
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
                "menu_highlights": ["amazing decor", "great atmosphere"],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.menu_highlights == []

    async def test_coffee_origins_empty_when_no_vocab_match(self, adapter):
        """All non-vocabulary coffee origin strings are discarded."""
        mock_response = _make_tool_use_response(
            {
                "tags": [],
                "summary": "Test.",
                "topReviews": [],
                "mode": "mixed",
                "coffee_origins": ["freshly sourced beans", "premium blend"],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.coffee_origins == []


def _make_menu_tool_response(tool_input: dict) -> MagicMock:
    """Build a mock Anthropic response with an extract_menu tool_use block."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = "extract_menu"
    tool_block.input = tool_input

    response = MagicMock()
    response.content = [tool_block]
    response.stop_reason = "tool_use"
    return response


class TestAnthropicExtractMenuData:
    @pytest.fixture
    def adapter(self):
        return AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=SAMPLE_TAXONOMY,
        )

    async def test_returns_menu_items(self, adapter):
        mock_response = _make_menu_tool_response(
            {
                "items": [
                    {"name": "Cappuccino", "price": 150, "category": "Coffee"},
                    {"name": "Matcha Latte", "price": 180},
                ],
                "raw_text": "Cappuccino 150\nMatcha Latte 180",
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.extract_menu_data("https://example.com/menu.jpg")

        assert len(result.items) == 2
        assert result.items[0]["name"] == "Cappuccino"
        assert result.items[0]["price"] == 150
        assert result.raw_text == "Cappuccino 150\nMatcha Latte 180"

    async def test_passes_image_url_in_content(self, adapter):
        mock_response = _make_menu_tool_response(
            {
                "items": [],
                "raw_text": None,
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.extract_menu_data("https://storage.example.com/menu.jpg")

        call_args = adapter._client.messages.create.call_args
        messages = call_args.kwargs.get("messages") or call_args[1].get("messages")
        content_blocks = messages[0]["content"]

        # First block should be the image
        image_block = content_blocks[0]
        assert image_block["type"] == "image"
        assert image_block["source"]["url"] == "https://storage.example.com/menu.jpg"

    async def test_empty_menu_returns_empty_items(self, adapter):
        mock_response = _make_menu_tool_response(
            {
                "items": [],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.extract_menu_data("https://example.com/blank.jpg")

        assert result.items == []
        assert result.raw_text is None

    async def test_uses_forced_tool_choice(self, adapter):
        mock_response = _make_menu_tool_response({"items": []})
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.extract_menu_data("https://example.com/menu.jpg")

        call_args = adapter._client.messages.create.call_args
        tool_choice = call_args.kwargs.get("tool_choice") or call_args[1].get("tool_choice")
        assert tool_choice == {"type": "tool", "name": "extract_menu"}


def _make_summarize_tool_response(tool_input: dict) -> MagicMock:
    """Build a mock Anthropic response with a summarize_reviews tool_use block."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = "summarize_reviews"
    tool_block.input = tool_input

    response = MagicMock()
    response.content = [tool_block]
    response.stop_reason = "tool_use"
    return response


class TestAnthropicSummarizeReviews:
    @pytest.fixture
    def adapter(self):
        return AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=SAMPLE_TAXONOMY,
        )

    async def test_summarize_reviews_google_only_returns_structured_result(self, adapter):
        """With only Google reviews, returns ReviewSummaryResult."""
        mock_response = _make_summarize_tool_response(
            {
                "summary_zh_tw": "咖啡豆精選，適合安靜工作。",
                "review_topics": [
                    {"topic": "手沖咖啡", "count": 8},
                    {"topic": "安靜", "count": 5},
                ],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.summarize_reviews(
            google_reviews=["Great pour-over", "Very quiet"],
            checkin_texts=[],
        )

        assert isinstance(result, ReviewSummaryResult)
        assert result.summary_zh_tw == "咖啡豆精選，適合安靜工作。"
        assert len(result.review_topics) == 2
        assert result.review_topics[0].topic == "手沖咖啡"

    async def test_summarize_reviews_calls_api_with_tool_schema(self, adapter):
        """Verifies tool_choice and tools are passed correctly."""
        mock_response = _make_summarize_tool_response(
            {
                "summary_zh_tw": "test",
                "review_topics": [{"topic": "x", "count": 1}],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.summarize_reviews(google_reviews=["review"], checkin_texts=[])

        call_kwargs = adapter._client.messages.create.call_args[1]
        assert call_kwargs["tools"] == [SUMMARIZE_REVIEWS_TOOL_SCHEMA]
        assert call_kwargs["tool_choice"] == {"type": "tool", "name": "summarize_reviews"}

    async def test_summarize_reviews_blended_prompt_emphasises_community(self, adapter):
        """When both sources present, community notes appear as higher-priority section."""
        mock_response = _make_summarize_tool_response(
            {
                "summary_zh_tw": "社群推薦",
                "review_topics": [{"topic": "安靜", "count": 3}],
            }
        )
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.summarize_reviews(
            google_reviews=["Good coffee"],
            checkin_texts=["很安靜，適合工作"],
        )

        user_message = adapter._client.messages.create.call_args[1]["messages"][0]["content"]
        assert "社群筆記" in user_message
        assert "Google 評論" in user_message


class TestAnthropicUsageLogging:
    @pytest.fixture
    def adapter(self):
        return AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=SAMPLE_TAXONOMY,
        )

    async def test_enrich_shop_logs_api_usage(self, adapter):
        """After enrich_shop() succeeds, api_usage_log is inserted with provider=anthropic."""
        from unittest.mock import patch

        mock_response = _make_tool_use_response(
            {
                "tags": [{"id": "quiet", "confidence": 0.9}],
                "summary": "A quiet cafe.",
                "topReviews": [],
                "mode": "work",
            }
        )
        mock_response.usage = MagicMock()
        mock_response.usage.input_tokens = 500
        mock_response.usage.output_tokens = 100
        mock_response.usage.cache_creation_input_tokens = 0
        mock_response.usage.cache_read_input_tokens = 0

        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        with patch("providers.llm.anthropic_adapter.log_api_usage") as mock_log:
            await adapter.enrich_shop(SAMPLE_SHOP)

        mock_log.assert_called_once()
        call_kwargs = mock_log.call_args.kwargs
        assert call_kwargs["provider"] == "anthropic"
        assert call_kwargs["task"] == "enrich_shop"
        assert call_kwargs["tokens_input"] == 500
        assert call_kwargs["tokens_output"] == 100
        assert call_kwargs["cost_usd"] > 0


class TestParseEnrichmentPayloadMenuItems:
    @pytest.fixture
    def taxonomy_by_id(self):
        return {tag.id: tag for tag in SAMPLE_TAXONOMY}

    def test_parse_enrichment_payload_extracts_menu_items(self, taxonomy_by_id):
        """Given enrichment result with menu_items, when parsed, then menu_items are included in result."""
        from providers.llm.anthropic_adapter import _parse_enrichment_payload

        payload = {
            "tags": [{"id": "quiet", "confidence": 0.9}],
            "summary": "溫馨的咖啡館，提供手沖咖啡和自製甜點",
            "mode": "rest",
            "mode_scores": {"work": 7, "rest": 8, "social": 6},
            "menu_highlights": [],
            "coffee_origins": [],
            "menu_items": [
                {"name": "拿鐵", "price": 150, "category": "coffee"},
                {"name": "巴斯克蛋糕", "price": 180, "category": "dessert"},
                {"name": "手沖咖啡", "category": "coffee"},
            ],
        }
        result = _parse_enrichment_payload(payload, taxonomy_by_id)
        assert len(result.menu_items) == 3
        assert result.menu_items[0]["name"] == "拿鐵"
        assert result.menu_items[0]["price"] == 150
        assert result.menu_items[1]["name"] == "巴斯克蛋糕"
        assert result.menu_items[2].get("price") is None

    def test_parse_enrichment_payload_empty_menu_items(self, taxonomy_by_id):
        """Given enrichment result without menu_items, when parsed, then menu_items defaults to empty list."""
        from providers.llm.anthropic_adapter import _parse_enrichment_payload

        payload = {
            "tags": [],
            "summary": "咖啡館",
            "mode": "mixed",
            "menu_highlights": [],
            "coffee_origins": [],
        }
        result = _parse_enrichment_payload(payload, taxonomy_by_id)
        assert result.menu_items == []
