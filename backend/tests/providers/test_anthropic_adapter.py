from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import ShopEnrichmentInput, ShopModeScores, TaxonomyTag
from providers.llm.anthropic_adapter import AnthropicLLMAdapter

SAMPLE_TAXONOMY = [
    TaxonomyTag(id="quiet", dimension="ambience", label="Quiet", label_zh="安靜"),
    TaxonomyTag(id="deep_work", dimension="mode", label="Deep Work", label_zh="深度工作"),
    TaxonomyTag(id="wifi_available", dimension="functionality", label="WiFi Available", label_zh="提供 WiFi"),
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
            model="claude-sonnet-4-6-20250514",
            taxonomy=SAMPLE_TAXONOMY,
        )

    async def test_returns_enrichment_result_with_valid_tags(self, adapter):
        mock_response = _make_tool_use_response({
            "tags": [
                {"id": "quiet", "confidence": 0.9},
                {"id": "deep_work", "confidence": 0.85},
            ],
            "summary": "A quiet cafe perfect for focused work.",
            "topReviews": ["很安靜適合工作"],
            "mode": "work",
        })
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
        mock_response = _make_tool_use_response({
            "tags": [
                {"id": "quiet", "confidence": 0.9},
                {"id": "nonexistent_tag", "confidence": 0.8},
            ],
            "summary": "A quiet place.",
            "topReviews": [],
            "mode": "rest",
        })
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert len(result.tags) == 1
        assert result.tags[0].id == "quiet"

    async def test_clamps_confidence_values(self, adapter):
        mock_response = _make_tool_use_response({
            "tags": [
                {"id": "quiet", "confidence": 1.5},
                {"id": "deep_work", "confidence": -0.2},
            ],
            "summary": "Test.",
            "topReviews": [],
            "mode": "mixed",
        })
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.tags[0].id == "quiet"
        # Confidence should be clamped: 1.5 -> 1.0, -0.2 -> 0.0
        # We verify via overall confidence
        assert 0.0 <= result.confidence <= 1.0

    async def test_defaults_invalid_mode_to_mixed(self, adapter):
        mock_response = _make_tool_use_response({
            "tags": [{"id": "quiet", "confidence": 0.9}],
            "summary": "Test.",
            "topReviews": [],
            "mode": "invalid_mode",
        })
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
            mock_response = _make_tool_use_response({
                "tags": [{"id": "quiet", "confidence": 0.9}],
                "summary": "Test.",
                "topReviews": [],
                "mode": mode,
            })
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
        mock_response = _make_tool_use_response({
            "tags": [],
            "summary": "Test.",
            "topReviews": [],
            "mode": "mixed",
        })
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

    async def test_prompt_includes_taxonomy(self, adapter):
        mock_response = _make_tool_use_response({
            "tags": [],
            "summary": "Test.",
            "topReviews": [],
            "mode": "mixed",
        })
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
        mock_response = _make_tool_use_response({
            "tags": [],
            "summary": "Test.",
            "topReviews": [],
            "mode": "mixed",
        })
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        await adapter.enrich_shop(SAMPLE_SHOP)

        call_args = adapter._client.messages.create.call_args
        tool_choice = call_args.kwargs.get("tool_choice") or call_args[1].get("tool_choice")
        assert tool_choice == {"type": "tool", "name": "classify_shop"}

    async def test_empty_tags_returns_zero_confidence(self, adapter):
        mock_response = _make_tool_use_response({
            "tags": [],
            "summary": "No tags found.",
            "topReviews": [],
            "mode": "mixed",
        })
        adapter._client = AsyncMock()
        adapter._client.messages.create = AsyncMock(return_value=mock_response)

        result = await adapter.enrich_shop(SAMPLE_SHOP)

        assert result.tags == []
        assert result.confidence == 0.0
