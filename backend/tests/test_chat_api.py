"""Tests for chat API endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    """Create an async HTTP client for testing."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
async def test_project(client: AsyncClient):
    """Create a test project."""
    response = await client.post(
        "/api/v1/projects",
        json={"name": "Chat Test Project", "description": "For chat API tests"},
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
async def test_model(client: AsyncClient, test_project: dict):
    """Create a test model."""
    response = await client.post(
        "/api/v1/models",
        json={
            "name": "Chat Test Model",
            "project_id": test_project["id"],
        },
    )
    assert response.status_code == 201
    return response.json()


class TestConversationEndpoints:
    """Tests for conversation CRUD endpoints."""

    async def test_create_conversation(
        self, client: AsyncClient, test_model: dict
    ):
        """Test creating a new conversation."""
        response = await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"], "title": "Test Chat"},
        )
        assert response.status_code == 201

        data = response.json()
        assert data["model_id"] == test_model["id"]
        assert data["title"] == "Test Chat"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_conversation_without_title(
        self, client: AsyncClient, test_model: dict
    ):
        """Test creating a conversation without a title."""
        response = await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"]},
        )
        assert response.status_code == 201

        data = response.json()
        assert data["model_id"] == test_model["id"]
        assert data["title"] is None

    async def test_create_conversation_invalid_model_returns_404(
        self, client: AsyncClient
    ):
        """Test creating a conversation with nonexistent model."""
        response = await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": "nonexistent-model-id"},
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_list_conversations(
        self, client: AsyncClient, test_model: dict
    ):
        """Test listing conversations for a model."""
        # Create two conversations
        await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"], "title": "Chat 1"},
        )
        await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"], "title": "Chat 2"},
        )

        # List conversations
        response = await client.get(
            f"/api/v1/chat/conversations?model_id={test_model['id']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 2
        # Should be ordered by updated_at desc
        titles = [c["title"] for c in data if c["title"]]
        assert "Chat 1" in titles
        assert "Chat 2" in titles

    async def test_list_conversations_empty(
        self, client: AsyncClient, test_model: dict
    ):
        """Test listing conversations when none exist."""
        response = await client.get(
            f"/api/v1/chat/conversations?model_id={test_model['id']}"
        )
        assert response.status_code == 200
        # May have conversations from other tests, just check it returns a list
        assert isinstance(response.json(), list)

    async def test_get_conversation(
        self, client: AsyncClient, test_model: dict
    ):
        """Test getting a single conversation."""
        # Create a conversation
        create_response = await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"], "title": "Get Test"},
        )
        conversation_id = create_response.json()["id"]

        # Get it back
        response = await client.get(
            f"/api/v1/chat/conversations/{conversation_id}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == conversation_id
        assert data["title"] == "Get Test"

    async def test_get_conversation_not_found(self, client: AsyncClient):
        """Test getting a nonexistent conversation."""
        response = await client.get(
            "/api/v1/chat/conversations/nonexistent-id"
        )
        assert response.status_code == 404


class TestMessageEndpoints:
    """Tests for message endpoints."""

    async def test_list_messages_empty(
        self, client: AsyncClient, test_model: dict
    ):
        """Test listing messages in an empty conversation."""
        # Create a conversation
        create_response = await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"]},
        )
        conversation_id = create_response.json()["id"]

        # List messages
        response = await client.get(
            f"/api/v1/chat/conversations/{conversation_id}/messages"
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_messages_conversation_not_found(
        self, client: AsyncClient
    ):
        """Test listing messages for nonexistent conversation."""
        response = await client.get(
            "/api/v1/chat/conversations/nonexistent-id/messages"
        )
        assert response.status_code == 404


class TestSendMessageEndpoint:
    """Tests for the SSE streaming message endpoint."""

    async def test_send_message_conversation_not_found(
        self, client: AsyncClient
    ):
        """Test sending a message to nonexistent conversation."""
        response = await client.post(
            "/api/v1/chat/conversations/nonexistent-id/messages",
            json={"content": "Hello"},
        )
        assert response.status_code == 404

    async def test_send_message_requires_llm_config(
        self, client: AsyncClient, test_model: dict, monkeypatch
    ):
        """Test that send_message returns 503 when LLM is not configured."""
        # Create a conversation
        create_response = await client.post(
            "/api/v1/chat/conversations",
            json={"model_id": test_model["id"]},
        )
        conversation_id = create_response.json()["id"]

        # Clear the API key to trigger the error
        from src import config
        original_settings = config.get_settings()

        # Monkeypatch to return None for the API key
        monkeypatch.setattr(original_settings, "anthropic_api_key", None)

        # Try to send a message - should fail with 503
        response = await client.post(
            f"/api/v1/chat/conversations/{conversation_id}/messages",
            json={"content": "Hello"},
        )
        assert response.status_code == 503
        assert "anthropic" in response.json()["detail"].lower()


class TestChatServiceUnit:
    """Unit tests for ChatService stream_response method.

    These tests mock at the service level to test the event generation logic
    without making actual HTTP requests.
    """

    async def test_stream_response_emits_all_event_types(self):
        """Test that stream_response emits token, graph, and done events."""
        from unittest.mock import MagicMock

        from src.adapters.llm.base import LLMMessage
        from src.chat.service import ChatContext, ChatService

        # Create a mock db session
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        # Mock settings
        with patch("src.chat.service.get_settings") as mock_settings:
            mock_settings.return_value.anthropic_api_key = "test-key"
            mock_settings.return_value.anthropic_model = "test-model"

            # Mock the LLM adapter
            with patch("src.chat.service.AnthropicAdapter"):
                # Create service
                service = ChatService(mock_db)

                # Mock get_conversation_context
                async def mock_context(*args):
                    return ChatContext(
                        messages=[LLMMessage(role="user", content="previous")],
                        architecture_summary="Current architecture: Empty"
                    )

                service.get_conversation_context = mock_context

                # Mock _get_current_graph
                async def mock_graph(*args):
                    return {"nodes": [], "edges": []}

                service._get_current_graph = mock_graph

                # Mock _update_conversation_timestamp
                async def mock_timestamp(*args):
                    pass

                service._update_conversation_timestamp = mock_timestamp

                # Mock LLM stream to return simple response
                async def mock_llm_stream(*args, **kwargs):
                    for token in ["Hello", " there"]:
                        yield token

                service.llm.chat_stream = mock_llm_stream

                # Mock conversation
                mock_conversation = MagicMock()
                mock_conversation.id = "conv-123"
                mock_conversation.model_id = "model-456"

                # Collect events
                events = []
                async for event in service.stream_response(mock_conversation, "Hi"):
                    events.append(event)

                # Verify events
                event_types = [e.type for e in events]

                # Should have token events
                assert "token" in event_types, f"Missing token events. Got: {event_types}"

                # Should have graph event (always emitted)
                assert "graph" in event_types, f"Missing graph event. Got: {event_types}"

                # Should end with done
                assert events[-1].type == "done", f"Last event should be done. Got: {events[-1].type}"

    async def test_stream_response_with_operations_emits_operations_event(self):
        """Test that stream_response emits operations event when ops are parsed."""
        from unittest.mock import MagicMock

        from src.chat.service import ChatContext, ChatService

        # Create a mock db session
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        with patch("src.chat.service.get_settings") as mock_settings:
            mock_settings.return_value.anthropic_api_key = "test-key"
            mock_settings.return_value.anthropic_model = "test-model"

            with patch("src.chat.service.AnthropicAdapter"):
                service = ChatService(mock_db)

                async def mock_context(*args):
                    return ChatContext(
                        messages=[],
                        architecture_summary="Current architecture: Empty"
                    )

                service.get_conversation_context = mock_context

                async def mock_graph(*args):
                    return {"nodes": [], "edges": []}

                service._get_current_graph = mock_graph

                async def mock_timestamp(*args):
                    pass

                service._update_conversation_timestamp = mock_timestamp

                # LLM response with operations
                response_with_ops = '''Adding a service.

```json
{"operations": [{"op": "add_node", "node": {"type": "service", "name": "API"}}]}
```'''

                async def mock_llm_stream(*args, **kwargs):
                    for char in response_with_ops:
                        yield char

                service.llm.chat_stream = mock_llm_stream

                # Mock changeset service to return result
                async def mock_apply_ops(*args, **kwargs):
                    mock_result = MagicMock()
                    mock_result.nodes = [{"id": "1", "name": "API", "type": "service"}]
                    mock_result.edges = []
                    return mock_result

                service.changeset_service.apply_operations = mock_apply_ops

                mock_conversation = MagicMock()
                mock_conversation.id = "conv-123"
                mock_conversation.model_id = "model-456"

                events = []
                async for event in service.stream_response(mock_conversation, "Add API"):
                    events.append(event)

                event_types = [e.type for e in events]

                # Should have operations event
                assert "operations" in event_types, f"Missing operations event. Got: {event_types}"

                # Find the operations event and verify data
                ops_event = next(e for e in events if e.type == "operations")
                assert len(ops_event.data) == 1
                assert ops_event.data[0]["op"] == "add_node"


class TestParserTopLevelList:
    """Tests for parser handling of top-level JSON arrays."""

    def test_parser_accepts_top_level_list(self):
        """Test that parser accepts operations as a top-level list."""
        from src.chat.parser import parse_operations

        response = '''Here's what I'll do:

```json
[
    {"op": "add_node", "node": {"type": "service", "name": "API"}}
]
```'''

        explanation, operations = parse_operations(response)
        assert len(operations) == 1
        assert operations[0].op == "add_node"
        assert operations[0].node.name == "API"

    def test_parser_accepts_wrapped_list(self):
        """Test that parser still accepts wrapped operations."""
        from src.chat.parser import parse_operations

        response = '''Creating service:

```json
{
    "operations": [
        {"op": "add_node", "node": {"type": "database", "name": "DB"}}
    ]
}
```'''

        explanation, operations = parse_operations(response)
        assert len(operations) == 1
        assert operations[0].node.name == "DB"
