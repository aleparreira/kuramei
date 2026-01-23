"""Tests for LLM adapters."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.adapters.llm import LLMAdapter, LLMMessage
from src.adapters.llm.anthropic import (
    AnthropicAdapter,
    LLMAPIError,
    LLMConnectionError,
    LLMRateLimitError,
)


class TestLLMAdapterInterface:
    """Test LLM adapter interface and initialization."""

    def test_anthropic_adapter_requires_api_key(self):
        """AnthropicAdapter should require a non-empty API key."""
        with pytest.raises(ValueError, match="API key is required"):
            AnthropicAdapter(api_key="")

        with pytest.raises(ValueError, match="API key is required"):
            AnthropicAdapter(api_key=None)  # type: ignore

    def test_anthropic_adapter_initializes_with_key(self):
        """AnthropicAdapter should initialize with a valid API key."""
        adapter = AnthropicAdapter(api_key="test-key")
        assert adapter.model == AnthropicAdapter.DEFAULT_MODEL
        assert isinstance(adapter, LLMAdapter)

    def test_anthropic_adapter_custom_model(self):
        """AnthropicAdapter should accept custom model."""
        adapter = AnthropicAdapter(api_key="test-key", model="claude-3-opus-20240229")
        assert adapter.model == "claude-3-opus-20240229"

    def test_llm_message_dataclass(self):
        """LLMMessage should be a proper dataclass."""
        msg = LLMMessage(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"

    def test_anthropic_convert_messages(self):
        """AnthropicAdapter should convert messages to API format."""
        adapter = AnthropicAdapter(api_key="test-key")
        messages = [
            LLMMessage(role="user", content="Hello"),
            LLMMessage(role="assistant", content="Hi there!"),
        ]
        converted = adapter._convert_messages(messages)
        assert converted == [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]


class TestAnthropicChat:
    """Test AnthropicAdapter.chat() method."""

    @pytest.fixture
    def adapter(self):
        """Create adapter with mocked client."""
        adapter = AnthropicAdapter(api_key="test-key")
        return adapter

    @pytest.fixture
    def mock_response(self):
        """Create a mock Anthropic response."""
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = "Hello, I am Claude!"

        response = MagicMock()
        response.content = [text_block]
        response.usage = MagicMock()
        response.usage.input_tokens = 10
        response.usage.output_tokens = 5
        return response

    async def test_chat_returns_response(self, adapter, mock_response):
        """chat() should return LLMResponse with content and token counts."""
        adapter.client.messages.create = AsyncMock(return_value=mock_response)

        messages = [LLMMessage(role="user", content="Hi")]
        result = await adapter.chat(messages)

        assert result.content == "Hello, I am Claude!"
        assert result.input_tokens == 10
        assert result.output_tokens == 5

    async def test_chat_concatenates_multiple_text_blocks(self, adapter):
        """chat() should concatenate multiple text blocks."""
        text_block1 = MagicMock()
        text_block1.type = "text"
        text_block1.text = "Hello, "

        text_block2 = MagicMock()
        text_block2.type = "text"
        text_block2.text = "world!"

        response = MagicMock()
        response.content = [text_block1, text_block2]
        response.usage = MagicMock()
        response.usage.input_tokens = 10
        response.usage.output_tokens = 5

        adapter.client.messages.create = AsyncMock(return_value=response)

        messages = [LLMMessage(role="user", content="Hi")]
        result = await adapter.chat(messages)

        assert result.content == "Hello, world!"

    async def test_chat_uses_custom_system_prompt(self, adapter, mock_response):
        """chat() should use custom system prompt when provided."""
        adapter.client.messages.create = AsyncMock(return_value=mock_response)

        messages = [LLMMessage(role="user", content="Hi")]
        await adapter.chat(messages, system_prompt="Custom prompt")

        adapter.client.messages.create.assert_called_once()
        call_kwargs = adapter.client.messages.create.call_args.kwargs
        assert call_kwargs["system"] == "Custom prompt"

    async def test_chat_handles_connection_error(self, adapter):
        """chat() should raise LLMConnectionError on connection failure."""
        from anthropic import APIConnectionError

        adapter.client.messages.create = AsyncMock(
            side_effect=APIConnectionError(request=MagicMock())
        )

        messages = [LLMMessage(role="user", content="Hi")]
        with pytest.raises(LLMConnectionError):
            await adapter.chat(messages)

    async def test_chat_handles_rate_limit_error(self, adapter):
        """chat() should raise LLMRateLimitError on rate limit."""
        from anthropic import RateLimitError

        mock_response = MagicMock()
        mock_response.status_code = 429
        adapter.client.messages.create = AsyncMock(
            side_effect=RateLimitError(
                message="Rate limit exceeded",
                response=mock_response,
                body=None,
            )
        )

        messages = [LLMMessage(role="user", content="Hi")]
        with pytest.raises(LLMRateLimitError):
            await adapter.chat(messages)

    async def test_chat_handles_api_status_error(self, adapter):
        """chat() should raise LLMAPIError on API errors."""
        from anthropic import APIStatusError

        mock_response = MagicMock()
        mock_response.status_code = 500
        adapter.client.messages.create = AsyncMock(
            side_effect=APIStatusError(
                message="Internal server error",
                response=mock_response,
                body=None,
            )
        )

        messages = [LLMMessage(role="user", content="Hi")]
        with pytest.raises(LLMAPIError):
            await adapter.chat(messages)


class TestAnthropicChatStream:
    """Test AnthropicAdapter.chat_stream() method."""

    @pytest.fixture
    def adapter(self):
        """Create adapter with mocked client."""
        adapter = AnthropicAdapter(api_key="test-key")
        return adapter

    async def test_chat_stream_yields_tokens(self, adapter):
        """chat_stream() should yield tokens as they arrive."""
        tokens = ["Hello", ", ", "world", "!"]

        async def mock_text_stream():
            for token in tokens:
                yield token

        mock_stream_manager = AsyncMock()
        mock_stream_manager.__aenter__ = AsyncMock(return_value=mock_stream_manager)
        mock_stream_manager.__aexit__ = AsyncMock(return_value=None)
        mock_stream_manager.text_stream = mock_text_stream()

        adapter.client.messages.stream = MagicMock(return_value=mock_stream_manager)

        messages = [LLMMessage(role="user", content="Hi")]
        result = adapter.chat_stream(messages)

        # Collect all yielded tokens
        collected = []
        async for token in result:
            collected.append(token)

        assert collected == tokens

    async def test_chat_stream_handles_connection_error(self, adapter):
        """chat_stream() should raise LLMConnectionError on connection failure."""
        from anthropic import APIConnectionError

        mock_stream_manager = AsyncMock()
        mock_stream_manager.__aenter__ = AsyncMock(
            side_effect=APIConnectionError(request=MagicMock())
        )

        adapter.client.messages.stream = MagicMock(return_value=mock_stream_manager)

        messages = [LLMMessage(role="user", content="Hi")]
        with pytest.raises(LLMConnectionError):
            async for _ in adapter.chat_stream(messages):
                pass

    async def test_chat_stream_handles_rate_limit_error(self, adapter):
        """chat_stream() should raise LLMRateLimitError on rate limit."""
        from anthropic import RateLimitError

        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_stream_manager = AsyncMock()
        mock_stream_manager.__aenter__ = AsyncMock(
            side_effect=RateLimitError(
                message="Rate limit exceeded",
                response=mock_response,
                body=None,
            )
        )

        adapter.client.messages.stream = MagicMock(return_value=mock_stream_manager)

        messages = [LLMMessage(role="user", content="Hi")]
        with pytest.raises(LLMRateLimitError):
            async for _ in adapter.chat_stream(messages):
                pass

    async def test_chat_stream_handles_api_status_error(self, adapter):
        """chat_stream() should raise LLMAPIError on API errors."""
        from anthropic import APIStatusError

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_stream_manager = AsyncMock()
        mock_stream_manager.__aenter__ = AsyncMock(
            side_effect=APIStatusError(
                message="Internal server error",
                response=mock_response,
                body=None,
            )
        )

        adapter.client.messages.stream = MagicMock(return_value=mock_stream_manager)

        messages = [LLMMessage(role="user", content="Hi")]
        with pytest.raises(LLMAPIError):
            async for _ in adapter.chat_stream(messages):
                pass
