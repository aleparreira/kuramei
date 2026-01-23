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
    """Schema for creating a model."""

    project_id: str


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


class NodeCreate(NodeBase):
    """Schema for creating a node within a graph context.

    Note: model_id is provided by the URL path parameter in graph endpoints,
    not in the request body. This schema is used within GraphData.
    """

    pass


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
    """

    pass


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
