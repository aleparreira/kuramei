"""Pydantic schemas for Kuramei architecture models domain."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

# --- Model schemas ---


class ModelBase(BaseModel):
    """Base schema for architecture model data."""

    name: str
    description: str | None = None
    status: str = "draft"
    version: str | None = None


class ModelCreate(ModelBase):
    """Schema for creating a model (with explicit project_id)."""

    project_id: str


class ModelCreateNested(ModelBase):
    """Schema for creating a model in nested endpoint.

    project_id comes from URL path, not request body.
    Used with POST /projects/{project_id}/models.
    """

    pass


class ModelUpdate(BaseModel):
    """Schema for updating a model (all fields optional)."""

    name: str | None = None
    description: str | None = None
    status: str | None = None
    version: str | None = None


class ModelResponse(ModelBase):
    """Schema for model responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime


# --- Node schemas ---


class NodeBase(BaseModel):
    """Base schema for node data."""

    type: str
    name: str
    description: str | None = None
    tags: list[str] | None = None
    properties: dict[str, Any] | None = None
    level: str | None = None
    parent_node_id: str | None = None
    position: dict[str, float] | None = None
    size: dict[str, float] | None = None
    cost: dict[str, Any] | None = None


class NodeCreateDirect(NodeBase):
    """Schema for creating a node directly (with explicit model_id)."""

    model_id: str


class NodeCreate(BaseModel):
    """Schema for creating a node within a graph context.

    Note: model_id is provided by the URL path parameter in graph endpoints,
    not in the request body. This schema is used within GraphData.
    The id is provided by the frontend (React Flow needs stable IDs).
    """

    id: str  # UUID from frontend (React Flow)
    type: str
    name: str
    position: dict[str, float]  # Required for React Flow {x, y}
    description: str | None = None
    tags: list[str] | None = None
    properties: dict[str, Any] | None = None
    level: str | None = None
    parent_node_id: str | None = None
    size: dict[str, float] | None = None
    cost: dict[str, Any] | None = None


class NodeUpdate(BaseModel):
    """Schema for updating a node (all fields optional)."""

    type: str | None = None
    name: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    properties: dict[str, Any] | None = None
    level: str | None = None
    parent_node_id: str | None = None
    position: dict[str, float] | None = None
    size: dict[str, float] | None = None
    cost: dict[str, Any] | None = None


class NodeResponse(NodeBase):
    """Schema for node responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    model_id: str
    created_at: datetime
    updated_at: datetime


# --- Edge schemas ---


class EdgeBase(BaseModel):
    """Base schema for edge data."""

    type: str
    source_node_id: str
    target_node_id: str
    label: str | None = None
    properties: dict[str, Any] | None = None


class EdgeCreateDirect(EdgeBase):
    """Schema for creating an edge directly (with explicit model_id)."""

    model_id: str


class EdgeCreate(EdgeBase):
    """Schema for creating an edge within a graph context.

    Note: model_id is provided by the URL path parameter in graph endpoints,
    not in the request body. This schema is used within GraphData.
    The id is provided by the frontend (React Flow needs stable IDs).
    """

    id: str  # UUID from frontend (React Flow)


class EdgeUpdate(BaseModel):
    """Schema for updating an edge (all fields optional)."""

    type: str | None = None
    source_node_id: str | None = None
    target_node_id: str | None = None
    label: str | None = None
    properties: dict[str, Any] | None = None


class EdgeResponse(EdgeBase):
    """Schema for edge responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    model_id: str
    created_at: datetime
    updated_at: datetime


# --- Graph schemas (for full graph persistence) ---


class GraphData(BaseModel):
    """Schema for full graph data (nodes + edges + viewport).

    Used with PUT /models/{model_id}/graph endpoint.
    The model_id is taken from the URL path, not included in node/edge objects.
    """

    nodes: list[NodeCreate]
    edges: list[EdgeCreate]
    viewport: dict[str, float] | None = None  # {x, y, zoom}


class GraphResponse(BaseModel):
    """Schema for graph response."""

    nodes: list[NodeResponse]
    edges: list[EdgeResponse]
    viewport: dict[str, float] | None = None


# --- Conversation schemas ---


class ConversationBase(BaseModel):
    """Base schema for conversation data."""

    title: str | None = None


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""

    model_id: str


class ConversationCreateNested(ConversationBase):
    """Schema for creating a conversation in nested endpoint.

    model_id comes from URL path, not request body.
    """

    pass


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation (all fields optional)."""

    title: str | None = None


class ConversationResponse(ConversationBase):
    """Schema for conversation responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    model_id: str
    created_at: datetime
    updated_at: datetime


# --- Message schemas ---


class MessageBase(BaseModel):
    """Base schema for message data."""

    role: str  # "user" | "assistant"
    content: str


class MessageCreate(MessageBase):
    """Schema for creating a message."""

    pass


class MessageResponse(MessageBase):
    """Schema for message responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    created_at: datetime


# --- ChangeSet schemas ---


class OperationBase(BaseModel):
    """Base schema for a single operation in a changeset."""

    op: str  # "add_node" | "update_node" | "delete_node" | "add_edge" | "update_edge" | "delete_edge"
    node: dict[str, Any] | None = None  # For node operations
    edge: dict[str, Any] | None = None  # For edge operations
    node_id: str | None = None  # For update/delete operations
    edge_id: str | None = None  # For update/delete operations


class ChangeSetBase(BaseModel):
    """Base schema for changeset data."""

    source: str  # "chat" | "manual"
    summary: str | None = None
    operations: list[OperationBase]


class ChangeSetCreate(ChangeSetBase):
    """Schema for creating a changeset."""

    model_id: str
    message_id: str | None = None


class ChangeSetResponse(BaseModel):
    """Schema for changeset responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    model_id: str
    message_id: str | None
    source: str
    summary: str | None
    operations: list[dict[str, Any]]  # JSON array
    status: str
    created_at: datetime


# --- Chat API schemas ---


class ChatMessageRequest(BaseModel):
    """Schema for sending a message in a conversation."""

    content: str


class ChatStreamEvent(BaseModel):
    """Schema for SSE stream events."""

    type: str  # "token" | "operations" | "graph" | "error" | "done"
    data: Any
