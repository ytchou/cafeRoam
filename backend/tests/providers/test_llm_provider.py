from unittest.mock import AsyncMock, MagicMock, patch

from models.types import ReviewSummaryResult
from providers.llm.anthropic_adapter import AnthropicLLMAdapter


class TestSummarizeReviews:
    async def test_returns_structured_result_from_claude_response(self):
        """Given review texts, summarize_reviews calls Claude with tool call and returns ReviewSummaryResult."""
        adapter = AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=[],
        )

        tool_block = MagicMock()
        tool_block.type = "tool_use"
        tool_block.name = "summarize_reviews"
        tool_block.input = {
            "summary_zh_tw": "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。",
            "review_topics": [{"topic": "拿鐵", "count": 4}, {"topic": "安靜", "count": 3}],
        }
        mock_response = MagicMock()
        mock_response.content = [tool_block]

        with patch.object(adapter, "_client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            result = await adapter.summarize_reviews(
                google_reviews=["超好喝的拿鐵", "巴斯克蛋糕很讚，環境安靜"],
                checkin_texts=[],
            )

        assert isinstance(result, ReviewSummaryResult)
        assert "拿鐵" in result.summary_zh_tw
        mock_client.messages.create.assert_called_once()
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"

    async def test_uses_haiku_model_not_default_model(self):
        """summarize_reviews should use the classify_model (Haiku), not the default enrichment model."""
        adapter = AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=[],
        )

        tool_block = MagicMock()
        tool_block.type = "tool_use"
        tool_block.name = "summarize_reviews"
        tool_block.input = {
            "summary_zh_tw": "Summary.",
            "review_topics": [{"topic": "咖啡", "count": 2}],
        }
        mock_response = MagicMock()
        mock_response.content = [tool_block]

        with patch.object(adapter, "_client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            await adapter.summarize_reviews(
                google_reviews=["review text"],
                checkin_texts=[],
            )

        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"
        assert call_kwargs["max_tokens"] == 512
