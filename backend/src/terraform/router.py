"""FastAPI router for Terraform generation endpoints."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.models import Edge, Model, Node
from src.terraform.mappings import has_terraform_resource
from src.terraform.schemas import (
    GenerateResponse,
    TerraformEdge,
    TerraformFile,
    TerraformNode,
    ValidationError,
    ValidationResult,
    ValidationWarning,
)
from src.terraform.service import TerraformGenerator

router = APIRouter()


def _parse_json_field(value: str | None) -> Any:
    """Parse a JSON string field, returning None if empty or invalid."""
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


async def _get_model_or_404(
    model_id: str,
    db: AsyncSession,
) -> Model:
    """Get a model by ID or raise 404."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )
    return model


async def _get_graph_data(
    model_id: str,
    db: AsyncSession,
) -> tuple[list[Node], list[Edge]]:
    """Get all nodes and edges for a model."""
    nodes_result = await db.execute(
        select(Node).where(Node.model_id == model_id).order_by(Node.created_at)
    )
    nodes = list(nodes_result.scalars().all())

    edges_result = await db.execute(
        select(Edge).where(Edge.model_id == model_id).order_by(Edge.created_at)
    )
    edges = list(edges_result.scalars().all())

    return nodes, edges


def _validate_model_for_terraform(
    nodes: list[Node],
    edges: list[Edge],
) -> ValidationResult:
    """Validate a model for Terraform export.

    Validation rules:
    1. Model has at least 1 node
    2. All edges reference existing nodes
    3. Required properties per node type (database needs engine, etc.)
    4. No duplicate node names within same type
    """
    errors: list[ValidationError] = []
    warnings: list[ValidationWarning] = []

    # Rule 1: At least one node
    if not nodes:
        errors.append(
            ValidationError(
                node_id="",
                node_name="",
                message="Model has no nodes. Add at least one node to export.",
            )
        )
        return ValidationResult(valid=False, errors=errors, warnings=warnings)

    # Build node lookup
    node_ids = {node.id for node in nodes}

    # Rule 2: Edge references valid nodes
    for edge in edges:
        if edge.source_node_id not in node_ids:
            errors.append(
                ValidationError(
                    node_id=edge.id,
                    node_name=f"Edge {edge.label or edge.id[:8]}",
                    message=f"Edge source references non-existent node: {edge.source_node_id}",
                )
            )
        if edge.target_node_id not in node_ids:
            errors.append(
                ValidationError(
                    node_id=edge.id,
                    node_name=f"Edge {edge.label or edge.id[:8]}",
                    message=f"Edge target references non-existent node: {edge.target_node_id}",
                )
            )

    # Rule 3: Required properties per node type
    for node in nodes:
        properties = _parse_json_field(node.properties) or {}

        # Database requires engine
        if node.type == "database":
            if not properties.get("engine"):
                errors.append(
                    ValidationError(
                        node_id=node.id,
                        node_name=node.name,
                        message="Database node requires 'engine' property (e.g., 'postgres', 'mysql')",
                    )
                )

        # Lambda requires runtime
        if node.type == "function":
            if not properties.get("runtime"):
                errors.append(
                    ValidationError(
                        node_id=node.id,
                        node_name=node.name,
                        message="Function node requires 'runtime' property (e.g., 'python3.11', 'nodejs20.x')",
                    )
                )

        # VPC requires cidr_block
        if node.type == "vpc":
            if not properties.get("cidr_block"):
                warnings.append(
                    ValidationWarning(
                        node_id=node.id,
                        node_name=node.name,
                        message="VPC node missing 'cidr_block' property; using default 10.0.0.0/16",
                    )
                )

        # Warn about node types without Terraform support
        if not has_terraform_resource(node.type) and node.type != "external_system":
            warnings.append(
                ValidationWarning(
                    node_id=node.id,
                    node_name=node.name,
                    message=f"Node type '{node.type}' has no Terraform template; will be skipped",
                )
            )

    # Rule 4: No duplicate node names within same type
    names_by_type: dict[str, list[str]] = {}
    for node in nodes:
        if node.type not in names_by_type:
            names_by_type[node.type] = []
        if node.name in names_by_type[node.type]:
            errors.append(
                ValidationError(
                    node_id=node.id,
                    node_name=node.name,
                    message=f"Duplicate node name '{node.name}' for type '{node.type}'",
                )
            )
        names_by_type[node.type].append(node.name)

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


def _convert_nodes_for_generator(nodes: list[Node]) -> list[TerraformNode]:
    """Convert ORM nodes to TerraformNode schema."""
    return [
        TerraformNode(
            id=node.id,
            name=node.name,
            type=node.type,
            description=node.description,
            properties=_parse_json_field(node.properties) or {},
            level=node.level,
        )
        for node in nodes
    ]


def _convert_edges_for_generator(edges: list[Edge]) -> list[TerraformEdge]:
    """Convert ORM edges to TerraformEdge schema."""
    return [
        TerraformEdge(
            id=edge.id,
            type=edge.type,
            source_node_id=edge.source_node_id,
            target_node_id=edge.target_node_id,
            label=edge.label,
            properties=_parse_json_field(edge.properties) or {},
        )
        for edge in edges
    ]


@router.get("/validate", response_model=ValidationResult)
async def validate_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> ValidationResult:
    """Validate a model for Terraform export.

    Returns validation result with errors and warnings.
    A model is valid for export if it has no errors.
    """
    # Verify model exists
    await _get_model_or_404(model_id, db)

    # Get graph data
    nodes, edges = await _get_graph_data(model_id, db)

    # Validate
    return _validate_model_for_terraform(nodes, edges)


@router.post("/generate", response_model=GenerateResponse)
async def generate_terraform(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> GenerateResponse:
    """Generate Terraform files from a model.

    The model is validated before generation. If validation fails
    with errors, a 400 error is returned.
    """
    # Verify model exists
    await _get_model_or_404(model_id, db)

    # Get graph data
    nodes, edges = await _get_graph_data(model_id, db)

    # Validate first
    validation = _validate_model_for_terraform(nodes, edges)
    if not validation.valid:
        # Return validation errors as 400
        error_messages = [f"{e.node_name}: {e.message}" for e in validation.errors]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Model validation failed",
                "errors": error_messages,
            },
        )

    # Convert to generator format
    tf_nodes = _convert_nodes_for_generator(nodes)
    tf_edges = _convert_edges_for_generator(edges)

    # Generate Terraform
    generator = TerraformGenerator()
    result = generator.generate(tf_nodes, tf_edges)

    # Convert to API response format
    files = [
        TerraformFile(path=f.filename, content=f.content)
        for f in result.files
    ]

    # Combine generator warnings with validation warnings
    all_warnings = result.warnings + [
        f"{w.node_name}: {w.message}" for w in validation.warnings
    ]

    return GenerateResponse(files=files, warnings=all_warnings)
