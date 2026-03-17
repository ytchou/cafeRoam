from unittest.mock import AsyncMock, MagicMock

import pytest

from core.tarot_vocabulary import TAROT_TITLES
from models.types import ShopEnrichmentInput, TaxonomyTag
from providers.llm.anthropic_adapter import AnthropicLLMAdapter


class TestTarotEnrichment:
    """Given a shop, the LLM adapter assigns a tarot title from the fixed vocabulary."""

    @pytest.fixture
    def adapter(self):
        taxonomy = [
            TaxonomyTag(id="quiet", dimension="ambience", label="Quiet", label_zh="安靜"),
            TaxonomyTag(
                id="laptop_friendly",
                dimension="functionality",
                label="Laptop Friendly",
                label_zh="可帶筆電",
            ),
        ]
        return AnthropicLLMAdapter(
            api_key="test-key", model="claude-sonnet-4-20250514", taxonomy=taxonomy
        )

    @pytest.fixture
    def mock_response(self):
        block = MagicMock()
        block.type = "tool_use"
        block.name = "assign_tarot"
        block.input = {
            "tarot_title": "The Scholar's Refuge",
            "flavor_text": "For those who seek quiet in an unquiet world.",
        }
        msg = MagicMock()
        msg.content = [block]
        return msg

    @pytest.mark.asyncio
    async def test_assigns_valid_tarot_title(self, adapter, mock_response):
        adapter._client.messages.create = AsyncMock(return_value=mock_response)
        shop = ShopEnrichmentInput(name="山小孩咖啡", reviews=["非常安靜，適合工作，空間寬敞"])
        result = await adapter.assign_tarot(shop)
        assert result.tarot_title in TAROT_TITLES

    @pytest.mark.asyncio
    async def test_returns_flavor_text(self, adapter, mock_response):
        adapter._client.messages.create = AsyncMock(return_value=mock_response)
        shop = ShopEnrichmentInput(name="山小孩咖啡", reviews=["手沖咖啡很棒，店員親切"])
        result = await adapter.assign_tarot(shop)
        assert len(result.flavor_text) > 0

    @pytest.mark.asyncio
    async def test_rejects_title_not_in_vocabulary(self, adapter):
        block = MagicMock()
        block.type = "tool_use"
        block.name = "assign_tarot"
        block.input = {
            "tarot_title": "The Invented Title",
            "flavor_text": "Some text.",
        }
        msg = MagicMock()
        msg.content = [block]
        adapter._client.messages.create = AsyncMock(return_value=msg)
        shop = ShopEnrichmentInput(name="山小孩咖啡", reviews=["環境舒適，推薦下午來"])
        result = await adapter.assign_tarot(shop)
        assert result.tarot_title is None  # Rejected — not in vocabulary
