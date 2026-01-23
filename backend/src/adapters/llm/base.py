"""Abstract LLM adapter interface for Kuramei."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal


@dataclass
class LLMMessage:
    """A message in the conversation history."""

    role: Literal["user", "assistant"]
    content: str


@dataclass
class LLMResponse:
    """Response from the LLM (non-streaming)."""

    content: str
    input_tokens: int | None = None
    output_tokens: int | None = None


# Default system prompt for architecture assistant
ARCHITECTURE_SYSTEM_PROMPT = """You are an AI architecture assistant for Kuramei, a platform for designing software architectures.

When the user describes changes to the architecture, respond with:
1. A brief explanation of what you're doing
2. A JSON block with operations to apply

The JSON block must be wrapped in ```json and ``` markers.

Available operations:
- add_node: Add a new node to the architecture
- update_node: Update properties of an existing node
- delete_node: Remove a node (and all connected edges)
- add_edge: Add a connection between nodes
- update_edge: Update properties of an existing edge
- delete_edge: Remove a connection

Example response:
"I'll add an API Gateway service and connect it to your database.

```json
{
  "operations": [
    {"op": "add_node", "node": {"type": "service", "name": "API Gateway"}},
    {"op": "add_edge", "edge": {"source": "API Gateway", "target": "PostgreSQL", "type": "calls", "label": "reads/writes"}}
  ]
}
```"

Node types: service, database, queue, storage, external, user, container, function
Edge types: calls, reads, writes, publishes, subscribes, contains

When no architecture changes are needed (e.g., for questions or explanations), respond normally without the JSON block.

Be concise and focus on the architectural decisions. The user is an experienced architect."""


class LLMAdapter(ABC):
    """Abstract base class for LLM adapters."""

    @abstractmethod
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
        """
        pass

    @abstractmethod
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
        """
        pass
