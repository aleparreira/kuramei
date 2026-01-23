"""FastAPI router for Kuramei architecture models domain."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.models import Edge, Model, Node
from src.models.schemas import (
    EdgeResponse,
    GraphData,
    GraphResponse,
    ModelCreate,
    ModelResponse,
    ModelUpdate,
    NodeResponse,
)
from src.projects.models import Project

router = APIRouter()


@router.get("/", response_model=list[ModelResponse])
async def list_models(
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Model]:
    """List all models, optionally filtered by project_id."""
    query = select(Model).order_by(Model.created_at.desc())
    if project_id:
        query = query.where(Model.project_id == project_id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    db: AsyncSession = Depends(get_db),
) -> Model:
    """Create a new architecture model."""
    # Validate project exists
    project_result = await db.execute(
        select(Project).where(Project.id == model_data.project_id)
    )
    if project_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project {model_data.project_id} not found",
        )

    model = Model(**model_data.model_dump())
    db.add(model)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create model: invalid data or constraint violation",
        )
    await db.refresh(model)
    return model


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> Model:
    """Get a model by ID."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )
    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    model_data: ModelUpdate,
    db: AsyncSession = Depends(get_db),
) -> Model:
    """Update a model."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )

    # Filter out None values to avoid setting required fields to null
    update_data = model_data.model_dump(exclude_unset=True)
    update_data = {k: v for k, v in update_data.items() if v is not None}

    for field, value in update_data.items():
        setattr(model, field, value)

    await db.commit()
    await db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a model."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )

    await db.delete(model)
    await db.commit()


# --- Graph endpoints ---


def _parse_json_field(value: str | None) -> Any:
    """Parse a JSON string field, returning None if empty or invalid."""
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def _serialize_json_field(value: Any) -> str | None:
    """Serialize a value to JSON string, returning None if empty."""
    if value is None:
        return None
    return json.dumps(value)


def _node_to_response(node: Node) -> NodeResponse:
    """Convert a Node ORM object to NodeResponse, parsing JSON fields."""
    return NodeResponse(
        id=node.id,
        model_id=node.model_id,
        type=node.type,
        name=node.name,
        description=node.description,
        tags=_parse_json_field(node.tags),
        properties=_parse_json_field(node.properties),
        level=node.level,
        parent_node_id=node.parent_node_id,
        position=_parse_json_field(node.position),
        size=_parse_json_field(node.size),
        cost=_parse_json_field(node.cost),
        created_at=node.created_at,
        updated_at=node.updated_at,
    )


def _edge_to_response(edge: Edge) -> EdgeResponse:
    """Convert an Edge ORM object to EdgeResponse, parsing JSON fields."""
    return EdgeResponse(
        id=edge.id,
        model_id=edge.model_id,
        type=edge.type,
        source_node_id=edge.source_node_id,
        target_node_id=edge.target_node_id,
        label=edge.label,
        properties=_parse_json_field(edge.properties),
        created_at=edge.created_at,
        updated_at=edge.updated_at,
    )


@router.get("/{model_id}/graph", response_model=GraphResponse)
async def get_graph(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> GraphResponse:
    """Get full graph (nodes + edges) for a model."""
    # Verify model exists
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )

    # Fetch nodes and edges
    nodes_result = await db.execute(
        select(Node).where(Node.model_id == model_id).order_by(Node.created_at)
    )
    nodes = nodes_result.scalars().all()

    edges_result = await db.execute(
        select(Edge).where(Edge.model_id == model_id).order_by(Edge.created_at)
    )
    edges = edges_result.scalars().all()

    return GraphResponse(
        nodes=[_node_to_response(n) for n in nodes],
        edges=[_edge_to_response(e) for e in edges],
        viewport=None,  # Could store in model metadata later
    )


@router.put("/{model_id}/graph", response_model=GraphResponse)
async def save_graph(
    model_id: str,
    graph_data: GraphData,
    db: AsyncSession = Depends(get_db),
) -> GraphResponse:
    """Save full graph (nodes + edges + viewport) for a model.

    This replaces all existing nodes and edges for the model.
    Node/edge IDs are provided by the frontend (React Flow).
    """
    # Verify model exists
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )

    # Delete existing edges first (they reference nodes)
    await db.execute(delete(Edge).where(Edge.model_id == model_id))
    # Delete existing nodes
    await db.execute(delete(Node).where(Node.model_id == model_id))

    # Create new nodes
    created_nodes = []
    for node_data in graph_data.nodes:
        node = Node(
            id=node_data.id,
            model_id=model_id,
            type=node_data.type,
            name=node_data.name,
            description=node_data.description,
            tags=_serialize_json_field(node_data.tags),
            properties=_serialize_json_field(node_data.properties),
            level=node_data.level,
            parent_node_id=node_data.parent_node_id,
            position=_serialize_json_field(node_data.position),
            size=_serialize_json_field(node_data.size),
            cost=_serialize_json_field(node_data.cost),
        )
        db.add(node)
        created_nodes.append(node)

    # Flush nodes to database before creating edges (edges reference nodes via FK)
    await db.flush()

    # Create new edges
    created_edges = []
    for edge_data in graph_data.edges:
        edge = Edge(
            id=edge_data.id,
            model_id=model_id,
            type=edge_data.type,
            source_node_id=edge_data.source_node_id,
            target_node_id=edge_data.target_node_id,
            label=edge_data.label,
            properties=_serialize_json_field(edge_data.properties),
        )
        db.add(edge)
        created_edges.append(edge)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to save graph: invalid node/edge references. {e!s}",
        )

    # Refresh to get created_at/updated_at
    for node in created_nodes:
        await db.refresh(node)
    for edge in created_edges:
        await db.refresh(edge)

    return GraphResponse(
        nodes=[_node_to_response(n) for n in created_nodes],
        edges=[_edge_to_response(e) for e in created_edges],
        viewport=graph_data.viewport,
    )
