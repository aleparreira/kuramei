"""Chat service for orchestrating LLM interactions and graph modifications."""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.llm.anthropic import AnthropicAdapter, LLMError
from src.adapters.llm.base import ARCHITECTURE_SYSTEM_PROMPT, LLMMessage
from src.chat.changeset_service import ChangeSetApplicationError, ChangeSetService
from src.chat.parser import parse_operations
from src.chat.schemas import Operation
from src.chat.serializers import serialize_edges, serialize_nodes
from src.config import get_settings
from src.models.models import Conversation, Edge, Message, Model, Node

logger = logging.getLogger(__name__)

# Number of recent messages to include in LLM context (including new user message)
# We fetch 9 to leave room for the new user message
CONTEXT_MESSAGE_LIMIT = 9


@dataclass
class ChatContext:
    """Context for the chat conversation including architecture state."""

    messages: list[LLMMessage]
    architecture_summary: str


@dataclass
class StreamEvent:
    """Event emitted during chat streaming."""

    type: str  # "token" | "operations" | "graph" | "error" | "done"
    data: Any


class ChatServiceError(Exception):
    """Error during chat service operations."""

    pass


class ChatService:
    """Service for handling chat interactions with the LLM."""

    def __init__(self, db: AsyncSession):
        self.db = db
        settings = get_settings()

        if not settings.anthropic_api_key:
            raise ChatServiceError(
                "Anthropic API key not configured. Set ANTHROPIC_API_KEY env var."
            )

        self.llm = AnthropicAdapter(
            api_key=settings.anthropic_api_key,
            model=settings.anthropic_model,
        )
        self.changeset_service = ChangeSetService(db)

    async def get_conversation_context(
        self, conversation: Conversation
    ) -> ChatContext:
        """Build context for LLM including recent messages and architecture state.

        Args:
            conversation: The conversation to build context for.

        Returns:
            ChatContext with messages and architecture summary.
        """
        # Get recent messages from conversation
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .limit(CONTEXT_MESSAGE_LIMIT)
        )
        messages = list(reversed(result.scalars().all()))

        # Convert to LLM messages
        llm_messages = [
            LLMMessage(role=msg.role, content=msg.content) for msg in messages
        ]

        # Build architecture summary
        architecture_summary = await self._build_architecture_summary(
            conversation.model_id
        )

        return ChatContext(messages=llm_messages, architecture_summary=architecture_summary)

    async def _build_architecture_summary(self, model_id: str) -> str:
        """Build a summary of the current architecture for LLM context.

        Args:
            model_id: The model ID to summarize.

        Returns:
            A text summary of nodes and edges.
        """
        # Fetch nodes
        nodes_result = await self.db.execute(
            select(Node).where(Node.model_id == model_id)
        )
        nodes = list(nodes_result.scalars().all())

        # Fetch edges
        edges_result = await self.db.execute(
            select(Edge).where(Edge.model_id == model_id)
        )
        edges = list(edges_result.scalars().all())

        if not nodes:
            return "Current architecture: Empty (no nodes or edges)"

        # Build summary
        lines = ["Current architecture:"]
        lines.append(f"Nodes ({len(nodes)}):")
        for node in nodes:
            lines.append(f"  - {node.name} ({node.type})")

        if edges:
            lines.append(f"Edges ({len(edges)}):")
            # Build node ID to name mapping
            node_names = {n.id: n.name for n in nodes}
            for edge in edges:
                source_name = node_names.get(edge.source_node_id, edge.source_node_id)
                target_name = node_names.get(edge.target_node_id, edge.target_node_id)
                label = f" [{edge.label}]" if edge.label else ""
                lines.append(f"  - {source_name} --{edge.type}{label}--> {target_name}")

        return "\n".join(lines)

    async def _get_current_graph(self, model_id: str) -> dict[str, Any]:
        """Get current graph state for a model.

        Args:
            model_id: The model ID to get graph for.

        Returns:
            Dict with nodes and edges arrays.
        """
        # Fetch nodes
        nodes_result = await self.db.execute(
            select(Node).where(Node.model_id == model_id)
        )
        nodes = list(nodes_result.scalars().all())

        # Fetch edges
        edges_result = await self.db.execute(
            select(Edge).where(Edge.model_id == model_id)
        )
        edges = list(edges_result.scalars().all())

        return {
            "nodes": serialize_nodes(nodes),
            "edges": serialize_edges(edges),
        }

    async def _update_conversation_timestamp(
        self, conversation: Conversation
    ) -> None:
        """Update the conversation's updated_at timestamp.

        Args:
            conversation: The conversation to update.
        """
        conversation.updated_at = datetime.utcnow()
        await self.db.commit()

    async def stream_response(
        self,
        conversation: Conversation,
        user_message: str,
    ) -> AsyncIterator[StreamEvent]:
        """Stream a chat response for a user message.

        This method:
        1. Builds context including architecture state BEFORE saving user message
        2. Saves the user message
        3. Streams LLM response tokens
        4. Parses operations from the response
        5. Applies operations to the graph
        6. Returns the updated graph state

        Args:
            conversation: The conversation to add the message to.
            user_message: The user's message content.

        Yields:
            StreamEvent objects for tokens, operations, graph state, and done.
        """
        try:
            # Build context BEFORE saving user message to avoid duplication
            context = await self.get_conversation_context(conversation)
            architecture_summary = context.architecture_summary

            # Now save user message
            user_msg = Message(
                conversation_id=conversation.id,
                role="user",
                content=user_message,
            )
            self.db.add(user_msg)
            await self.db.commit()
            await self.db.refresh(user_msg)

            # Update conversation timestamp
            await self._update_conversation_timestamp(conversation)

            # Build system prompt with architecture context
            system_prompt = f"{ARCHITECTURE_SYSTEM_PROMPT}\n\n{architecture_summary}"

            # Add the new user message to context (now it's the only copy)
            context.messages.append(LLMMessage(role="user", content=user_message))

            # Stream LLM response
            full_response = ""
            llm_error = None
            try:
                async for token in self.llm.chat_stream(
                    messages=context.messages,
                    system_prompt=system_prompt,
                ):
                    full_response += token
                    yield StreamEvent(type="token", data=token)

            except LLMError as e:
                logger.error(f"LLM error during streaming: {e}")
                llm_error = e
                yield StreamEvent(type="error", data=str(e))

            if llm_error:
                # Still emit current graph state and done on error
                graph = await self._get_current_graph(conversation.model_id)
                yield StreamEvent(type="graph", data=graph)
                yield StreamEvent(type="done", data=None)
                return

            # Save assistant message
            assistant_msg = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_response,
            )
            self.db.add(assistant_msg)
            await self.db.commit()
            await self.db.refresh(assistant_msg)

            # Update conversation timestamp again
            await self._update_conversation_timestamp(conversation)

            # Parse operations from response
            explanation, operations = parse_operations(full_response)

            if operations:
                # Emit operations event
                yield StreamEvent(
                    type="operations",
                    data=[self._serialize_operation(op) for op in operations],
                )

                # Apply operations to graph
                try:
                    result = await self.changeset_service.apply_operations(
                        model_id=conversation.model_id,
                        operations=operations,
                        message_id=assistant_msg.id,
                        source="chat",
                    )

                    # Emit updated graph
                    yield StreamEvent(
                        type="graph",
                        data={"nodes": result.nodes, "edges": result.edges},
                    )

                except ChangeSetApplicationError as e:
                    logger.error(f"Failed to apply operations: {e}")
                    yield StreamEvent(type="error", data=f"Failed to apply changes: {e}")
                    # Emit current (unchanged) graph state
                    graph = await self._get_current_graph(conversation.model_id)
                    yield StreamEvent(type="graph", data=graph)

            else:
                # No operations - still emit current graph state
                graph = await self._get_current_graph(conversation.model_id)
                yield StreamEvent(type="graph", data=graph)

            # Signal completion
            yield StreamEvent(type="done", data=None)

        except Exception as e:
            # Catch-all to ensure graph and done are always emitted
            logger.exception(f"Unexpected error in stream_response: {e}")
            yield StreamEvent(type="error", data=f"Unexpected error: {e}")
            # Try to emit current graph state (best effort)
            try:
                graph = await self._get_current_graph(conversation.model_id)
                yield StreamEvent(type="graph", data=graph)
            except Exception as graph_error:
                logger.warning(f"Could not emit graph after error: {graph_error}")
            yield StreamEvent(type="done", data=None)

    def _serialize_operation(self, op: Operation) -> dict[str, Any]:
        """Serialize an operation to a dict."""
        return op.model_dump()

    async def validate_model_exists(self, model_id: str) -> Model:
        """Validate that a model exists and return it.

        Args:
            model_id: The model ID to validate.

        Returns:
            The Model object.

        Raises:
            ChatServiceError: If the model doesn't exist.
        """
        result = await self.db.execute(select(Model).where(Model.id == model_id))
        model = result.scalar_one_or_none()
        if model is None:
            raise ChatServiceError(f"Model {model_id} not found")
        return model
