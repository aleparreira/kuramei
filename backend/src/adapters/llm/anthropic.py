"""Anthropic Claude LLM adapter for Kuramei."""

import logging
from collections.abc import AsyncIterator

import anthropic
from anthropic import APIConnectionError, APIStatusError, RateLimitError

from src.adapters.llm.base import (
    ARCHITECTURE_SYSTEM_PROMPT,
    LLMAdapter,
    LLMMessage,
    LLMResponse,
)

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base exception for LLM errors."""

    pass


class LLMConnectionError(LLMError):
    """Error connecting to the LLM API."""

    pass


class LLMRateLimitError(LLMError):
    """Rate limit exceeded."""

    pass


class LLMAPIError(LLMError):
    """General API error."""

    pass


class AnthropicAdapter(LLMAdapter):
    """Anthropic Claude adapter with streaming support."""

    DEFAULT_MODEL = "claude-sonnet-4-20250514"
    MAX_TOKENS = 4096

    def __init__(self, api_key: str, model: str | None = None):
        """Initialize the Anthropic adapter.

        Args:
            api_key: Anthropic API key.
            model: Model to use. Defaults to claude-sonnet-4-20250514.
        """
        if not api_key:
            raise ValueError("Anthropic API key is required")

        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model or self.DEFAULT_MODEL
        logger.info(f"Anthropic adapter initialized with model: {self.model}")

    def _convert_messages(
        self, messages: list[LLMMessage]
    ) -> list[dict[str, str]]:
        """Convert LLMMessage objects to Anthropic format."""
        return [{"role": m.role, "content": m.content} for m in messages]

    async def chat(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None = None,
    ) -> LLMResponse:
        """Send a chat request and get a complete response.

        Args:
            messages: List of messages in the conversation.
            system_prompt: Optional system prompt. Defaults to architecture assistant.

        Returns:
            The complete LLM response.

        Raises:
            LLMConnectionError: If connection to API fails.
            LLMRateLimitError: If rate limit is exceeded.
            LLMAPIError: For other API errors.
        """
        system = system_prompt or ARCHITECTURE_SYSTEM_PROMPT

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=self._convert_messages(messages),
            )

            # Extract text content from response
            content = ""
            for block in response.content:
                if block.type == "text":
                    content += block.text

            return LLMResponse(
                content=content,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
            )

        except APIConnectionError as e:
            logger.error(f"Anthropic connection error: {e}")
            raise LLMConnectionError(
                "Failed to connect to Anthropic API"
            ) from e
        except RateLimitError as e:
            logger.error(f"Anthropic rate limit: {e}")
            raise LLMRateLimitError("Anthropic rate limit exceeded") from e
        except APIStatusError as e:
            logger.error(f"Anthropic API error: {e}")
            raise LLMAPIError(f"Anthropic API error: {e.message}") from e

    async def chat_stream(
        self,
        messages: list[LLMMessage],
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        """Send a chat request and stream the response.

        Args:
            messages: List of messages in the conversation.
            system_prompt: Optional system prompt. Defaults to architecture assistant.

        Yields:
            String tokens as they are generated.

        Raises:
            LLMConnectionError: If connection to API fails.
            LLMRateLimitError: If rate limit is exceeded.
            LLMAPIError: For other API errors.
        """
        system = system_prompt or ARCHITECTURE_SYSTEM_PROMPT

        try:
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=self._convert_messages(messages),
            ) as stream:
                async for text in stream.text_stream:
                    yield text

        except APIConnectionError as e:
            logger.error(f"Anthropic connection error during stream: {e}")
            raise LLMConnectionError(
                "Failed to connect to Anthropic API"
            ) from e
        except RateLimitError as e:
            logger.error(f"Anthropic rate limit during stream: {e}")
            raise LLMRateLimitError("Anthropic rate limit exceeded") from e
        except APIStatusError as e:
            logger.error(f"Anthropic API error during stream: {e}")
            raise LLMAPIError(f"Anthropic API error: {e.message}") from e
