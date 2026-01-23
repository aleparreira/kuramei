"""LLM adapters for Kuramei."""

from src.adapters.llm.base import LLMAdapter, LLMMessage, LLMResponse

__all__ = ["LLMAdapter", "LLMMessage", "LLMResponse", "AnthropicAdapter"]


def __getattr__(name: str):
    """Lazy import AnthropicAdapter to avoid requiring anthropic package."""
    if name == "AnthropicAdapter":
        from src.adapters.llm.anthropic import AnthropicAdapter

        return AnthropicAdapter
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
