"""Tests for LLM adapters."""

import pytest

from src.adapters.llm import AnthropicAdapter, LLMAdapter, LLMMessage


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
