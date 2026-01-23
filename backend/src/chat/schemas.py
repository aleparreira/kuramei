"""Pydantic schemas for LLM operations on architecture graphs."""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class NodeSpec(BaseModel):
    """Specification for a node in the architecture graph."""

    type: str = Field(
        ...,
        description="Node type: service, database, queue, storage, external, user, container, function",
    )
    name: str = Field(..., description="Display name for the node")
    description: str | None = Field(None, description="Optional description")
    position: dict[str, float] | None = Field(
        None, description="Position {x, y} - optional, frontend calculates if not provided"
    )
    properties: dict[str, Any] | None = Field(
        None, description="Additional properties"
    )


class EdgeSpec(BaseModel):
    """Specification for an edge (connection) in the architecture graph."""

    source: str = Field(..., description="Source node name or ID")
    target: str = Field(..., description="Target node name or ID")
    type: str = Field(
        "calls",
        description="Edge type: calls, reads, writes, publishes, subscribes, contains",
    )
    label: str | None = Field(None, description="Optional label for the edge")
    properties: dict[str, Any] | None = Field(
        None, description="Additional properties"
    )


class AddNodeOp(BaseModel):
    """Operation to add a new node."""

    op: Literal["add_node"]
    node: NodeSpec


class UpdateNodeOp(BaseModel):
    """Operation to update an existing node."""

    op: Literal["update_node"]
    node_id: str = Field(..., description="ID or name of the node to update")
    updates: dict[str, Any] = Field(..., description="Fields to update")


class DeleteNodeOp(BaseModel):
    """Operation to delete a node (and all connected edges)."""

    op: Literal["delete_node"]
    node_id: str = Field(..., description="ID or name of the node to delete")


class AddEdgeOp(BaseModel):
    """Operation to add a new edge."""

    op: Literal["add_edge"]
    edge: EdgeSpec


class UpdateEdgeOp(BaseModel):
    """Operation to update an existing edge."""

    op: Literal["update_edge"]
    edge_id: str = Field(..., description="ID of the edge to update")
    updates: dict[str, Any] = Field(..., description="Fields to update")


class DeleteEdgeOp(BaseModel):
    """Operation to delete an edge."""

    op: Literal["delete_edge"]
    edge_id: str = Field(..., description="ID of the edge to delete")


# Union type for all operations
Operation = Annotated[
    AddNodeOp | UpdateNodeOp | DeleteNodeOp | AddEdgeOp | UpdateEdgeOp | DeleteEdgeOp,
    Field(discriminator="op"),
]


class ParsedOperations(BaseModel):
    """Container for parsed operations from LLM response."""

    operations: list[Operation] = Field(default_factory=list)


class ValidationError(BaseModel):
    """A single validation error."""

    operation_index: int
    operation_type: str
    field: str
    message: str


class ValidationResult(BaseModel):
    """Result of validating operations against existing graph state."""

    valid: bool
    errors: list[ValidationError] = Field(default_factory=list)
