from unittest.mock import AsyncMock, MagicMock, patch

from providers.llm.anthropic_adapter import AnthropicLLMAdapter


class TestSummarizeReviews:
    async def test_returns_summary_text_from_claude_response(self):
        """Given a list of review texts, summarize_reviews calls Claude and returns the text content."""
        adapter = AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=[],
        )

        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(type="text", text="顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。")
        ]

        with patch.object(adapter, "_client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            result = await adapter.summarize_reviews(["超好喝的拿鐵", "巴斯克蛋糕很讚，環境安靜"])

        assert result == "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。"
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

        mock_response = MagicMock()
        mock_response.content = [MagicMock(type="text", text="Summary.")]

        with patch.object(adapter, "_client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            await adapter.summarize_reviews(["review text"])

        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"
        assert call_kwargs["max_tokens"] == 512
