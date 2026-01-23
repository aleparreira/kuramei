"""FastAPI router for chat API endpoints.

NOTE: Authentication/authorization is intentionally NOT implemented in this MVP.
The Kuramei project is in early development phase and auth will be added in a
dedicated security task when user management is implemented.

See: https://github.com/kuramei/kuramei/issues/xxx (future auth task)
"""

import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from src.chat.service import ChatService, ChatServiceError
from src.database import get_db
from src.models.models import Conversation, Message, Model
from src.models.schemas import (
    ChatMessageRequest,
    ConversationCreate,
    ConversationResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _validate_model_exists(db: AsyncSession, model_id: str) -> Model:
    """Validate that a model exists without requiring LLM configuration.

    Args:
        db: Database session.
        model_id: The model ID to validate.

    Returns:
        The Model object.

    Raises:
        HTTPException: If the model doesn't exist.
    """
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )
    return model


def _get_chat_service(db: AsyncSession) -> ChatService:
    """Create a ChatService instance.

    This is separated to allow easier error handling for missing API keys.
    Only called for endpoints that need LLM functionality.
    """
    try:
        return ChatService(db)
    except ChatServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    conversation_data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
) -> Conversation:
    """Create a new conversation for a model.

    The model_id must reference an existing architecture model.
    This endpoint does not require LLM configuration.
    """
    # Validate model exists (without LLM dependency)
    await _validate_model_exists(db, conversation_data.model_id)

    # Create conversation
    conversation = Conversation(
        model_id=conversation_data.model_id,
        title=conversation_data.title,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return conversation


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[Conversation]:
    """List conversations for a model.

    The model_id query parameter is required.
    """
    result = await db.execute(
        select(Conversation)
        .where(Conversation.model_id == model_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
) -> Conversation:
    """Get a conversation by ID."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    return conversation


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def list_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[Message]:
    """List messages in a conversation."""
    # Verify conversation exists
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    if conv_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def _stream_sse_events(
    service: ChatService,
    conversation: Conversation,
    user_message: str,
) -> AsyncIterator[dict]:
    """Stream SSE events from the chat service.

    Yields dicts with 'event' and 'data' keys for EventSourceResponse.
    Token events are sent as plain text, other events are JSON encoded.
    """
    async for event in service.stream_response(conversation, user_message):
        # Token events are plain strings, other events need JSON encoding
        if event.type == "token":
            data = event.data if event.data is not None else ""
        else:
            data = json.dumps(event.data) if event.data is not None else ""

        yield {
            "event": event.type,
            "data": data,
        }


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message_data: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    """Send a message to a conversation and stream the response.

    This endpoint returns a Server-Sent Events (SSE) stream with the following events:

    - `token`: Text chunks as they are generated by the LLM
    - `operations`: Parsed operations array from the LLM response
    - `graph`: Updated graph state after applying operations (always emitted)
    - `error`: Error message if something fails
    - `done`: Signals the end of the stream (always emitted, even after errors)
    """
    # Get conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    # Create service (requires LLM configuration)
    service = _get_chat_service(db)

    # Return SSE stream using EventSourceResponse
    return EventSourceResponse(
        _stream_sse_events(service, conversation, message_data.content),
        headers={
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
