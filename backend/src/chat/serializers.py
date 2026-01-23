"""Serialization utilities for chat-related entities."""

import json
from typing import Any

from src.models.models import Edge, Node


def _parse_json(value: str | None) -> Any:
    """Parse a JSON string field, returning None if empty or invalid."""
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def serialize_node(node: Node) -> dict[str, Any]:
    """Serialize a Node to a dict for API responses."""
    return {
        "id": node.id,
        "model_id": node.model_id,
        "type": node.type,
        "name": node.name,
        "description": node.description,
        "tags": _parse_json(node.tags),
        "properties": _parse_json(node.properties),
        "level": node.level,
        "parent_node_id": node.parent_node_id,
        "position": _parse_json(node.position),
        "size": _parse_json(node.size),
        "cost": _parse_json(node.cost),
        "created_at": node.created_at.isoformat() if node.created_at else None,
        "updated_at": node.updated_at.isoformat() if node.updated_at else None,
    }


def serialize_edge(edge: Edge) -> dict[str, Any]:
    """Serialize an Edge to a dict for API responses."""
    return {
        "id": edge.id,
        "model_id": edge.model_id,
        "type": edge.type,
        "source_node_id": edge.source_node_id,
        "target_node_id": edge.target_node_id,
        "label": edge.label,
        "properties": _parse_json(edge.properties),
        "created_at": edge.created_at.isoformat() if edge.created_at else None,
        "updated_at": edge.updated_at.isoformat() if edge.updated_at else None,
    }


def serialize_nodes(nodes: list[Node]) -> list[dict[str, Any]]:
    """Serialize a list of nodes."""
    return [serialize_node(n) for n in nodes]


def serialize_edges(edges: list[Edge]) -> list[dict[str, Any]]:
    """Serialize a list of edges."""
    return [serialize_edge(e) for e in edges]
