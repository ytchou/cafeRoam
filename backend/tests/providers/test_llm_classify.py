from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import PhotoCategory
from providers.llm.anthropic_adapter import AnthropicLLMAdapter


@pytest.fixture
def adapter():
    with patch("providers.llm.anthropic_adapter.AsyncAnthropic") as mock_cls:
        instance = mock_cls.return_value
        a = AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-sonnet-4-6",
            classify_model="claude-haiku-4-5-20251001",
            taxonomy=[],
        )
        a._client = instance
        return a


def _tool_use_block(name: str, input: dict) -> MagicMock:
    """Build a MagicMock that looks like an Anthropic ToolUseBlock.

    MagicMock(name=...) sets the mock's display name, NOT the .name attribute.
    Explicit assignment is required for .name and .input.
    """
    block = MagicMock()
    block.type = "tool_use"
    block.name = name
    block.input = input
    return block


@pytest.mark.asyncio
async def test_classify_photo_returns_menu_category(adapter):
    """When Claude classifies a photo as MENU, the method returns PhotoCategory.MENU."""
    mock_response = MagicMock()
    mock_response.content = [_tool_use_block("classify_photo", {"category": "MENU"})]
    adapter._client.messages.create = AsyncMock(return_value=mock_response)

    result = await adapter.classify_photo("https://cdn/menu.jpg")

    assert result == PhotoCategory.MENU
    # Verify Haiku model was used, not Sonnet
    call_kwargs = adapter._client.messages.create.call_args.kwargs
    assert "haiku" in call_kwargs["model"]


@pytest.mark.asyncio
async def test_classify_photo_sends_image_url(adapter):
    """The image URL is sent in the correct Vision API format."""
    mock_response = MagicMock()
    mock_response.content = [_tool_use_block("classify_photo", {"category": "VIBE"})]
    adapter._client.messages.create = AsyncMock(return_value=mock_response)

    await adapter.classify_photo("https://cdn/cozy-interior.jpg")

    call_kwargs = adapter._client.messages.create.call_args.kwargs
    messages = call_kwargs["messages"]
    image_block = messages[0]["content"][0]
    assert image_block["type"] == "image"
    assert image_block["source"]["url"] == "https://cdn/cozy-interior.jpg"
