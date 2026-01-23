"""Service for applying operations to the architecture graph atomically."""

import json
import logging
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.chat.parser import validate_operations
from src.chat.schemas import (
    AddEdgeOp,
    AddNodeOp,
    DeleteEdgeOp,
    DeleteNodeOp,
    Operation,
    UpdateEdgeOp,
    UpdateNodeOp,
)
from src.chat.serializers import serialize_edges, serialize_nodes
from src.models.models import ChangeSet, Edge, Model, Node

logger = logging.getLogger(__name__)


def _serialize_json(value: Any) -> str | None:
    """Serialize a value to JSON string, returning None if empty."""
    if value is None:
        return None
    return json.dumps(value)


def _parse_json(value: str | None) -> Any:
    """Parse a JSON string field, returning None if empty or invalid."""
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


@dataclass
class GraphState:
    """Current state of the graph for applying operations."""

    nodes: dict[str, Node]  # id -> Node
    edges: dict[str, Edge]  # id -> Edge
    name_to_id: dict[str, str]  # node name -> node id (for name-based references)


@dataclass
class ApplyResult:
    """Result of applying operations to the graph."""

    changeset: ChangeSet
    nodes: list[dict[str, Any]]  # Serialized nodes
    edges: list[dict[str, Any]]  # Serialized edges


class ChangeSetApplicationError(Exception):
    """Error during changeset application."""

    def __init__(self, message: str, operation_index: int | None = None):
        super().__init__(message)
        self.operation_index = operation_index


class ChangeSetService:
    """Service for applying operations to the architecture graph atomically."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def apply_operations(
        self,
        model_id: str,
        operations: list[Operation],
        message_id: str | None = None,
        source: str = "chat",
    ) -> ApplyResult:
        """Apply a list of operations to the graph atomically.

        All operations are applied within a single transaction. If any operation
        fails, all changes are rolled back.

        Args:
            model_id: The ID of the model to modify.
            operations: List of operations to apply.
            message_id: Optional ID of the message that generated these operations.
            source: Source of the operations ("chat" or "manual").

        Returns:
            ApplyResult containing the changeset and updated graph state.

        Raises:
            ChangeSetApplicationError: If any operation fails.
        """
        # Verify model exists first (for both empty and non-empty operations)
        result = await self.db.execute(select(Model).where(Model.id == model_id))
        model = result.scalar_one_or_none()
        if model is None:
            raise ChangeSetApplicationError(f"Model {model_id} not found")

        if not operations:
            # No operations to apply - still create a changeset for record
            changeset = await self._create_changeset(
                model_id=model_id,
                message_id=message_id,
                source=source,
                operations=[],
                summary="No operations to apply",
            )
            # Commit to persist the changeset
            await self.db.commit()
            graph = await self._load_graph_state(model_id)
            return ApplyResult(
                changeset=changeset,
                nodes=self._serialize_nodes(list(graph.nodes.values())),
                edges=self._serialize_edges(list(graph.edges.values())),
            )

        # Load current graph state
        graph = await self._load_graph_state(model_id)

        # Validate operations against current state
        existing_nodes = {**graph.name_to_id, **{n.id: n.id for n in graph.nodes.values()}}
        existing_edges = {e.id: (e.source_node_id, e.target_node_id) for e in graph.edges.values()}

        validation = validate_operations(operations, existing_nodes, existing_edges)
        if not validation.valid:
            error_msgs = [f"[{e.operation_index}] {e.message}" for e in validation.errors]
            raise ChangeSetApplicationError(
                f"Validation failed: {'; '.join(error_msgs)}"
            )

        # Apply operations one by one
        try:
            for i, op in enumerate(operations):
                await self._apply_operation(model_id, graph, op, i)

            # Flush to ensure all changes are written before commit
            await self.db.flush()

            # Generate summary
            summary = self._generate_summary(operations)

            # Create changeset record
            changeset = await self._create_changeset(
                model_id=model_id,
                message_id=message_id,
                source=source,
                operations=[self._serialize_operation(op) for op in operations],
                summary=summary,
            )

            # Commit the transaction
            await self.db.commit()

            # Refresh nodes and edges to get updated timestamps
            for node in graph.nodes.values():
                await self.db.refresh(node)
            for edge in graph.edges.values():
                await self.db.refresh(edge)

            return ApplyResult(
                changeset=changeset,
                nodes=self._serialize_nodes(list(graph.nodes.values())),
                edges=self._serialize_edges(list(graph.edges.values())),
            )

        except ChangeSetApplicationError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.exception(f"Error applying operations: {e}")
            raise ChangeSetApplicationError(f"Failed to apply operations: {e}")

    async def _load_graph_state(self, model_id: str) -> GraphState:
        """Load current nodes and edges for a model."""
        nodes_result = await self.db.execute(
            select(Node).where(Node.model_id == model_id)
        )
        nodes = {n.id: n for n in nodes_result.scalars().all()}

        edges_result = await self.db.execute(
            select(Edge).where(Edge.model_id == model_id)
        )
        edges = {e.id: e for e in edges_result.scalars().all()}

        # Build name -> id mapping for node reference by name
        name_to_id = {n.name: n.id for n in nodes.values()}

        return GraphState(nodes=nodes, edges=edges, name_to_id=name_to_id)

    async def _apply_operation(
        self,
        model_id: str,
        graph: GraphState,
        op: Operation,
        index: int,
    ) -> None:
        """Apply a single operation to the graph state."""
        if isinstance(op, AddNodeOp):
            await self._add_node(model_id, graph, op, index)
        elif isinstance(op, UpdateNodeOp):
            await self._update_node(graph, op, index)
        elif isinstance(op, DeleteNodeOp):
            await self._delete_node(graph, op, index)
        elif isinstance(op, AddEdgeOp):
            await self._add_edge(model_id, graph, op, index)
        elif isinstance(op, UpdateEdgeOp):
            await self._update_edge(graph, op, index)
        elif isinstance(op, DeleteEdgeOp):
            await self._delete_edge(graph, op, index)
        else:
            raise ChangeSetApplicationError(
                f"Unknown operation type: {type(op).__name__}",
                operation_index=index,
            )

    async def _add_node(
        self, model_id: str, graph: GraphState, op: AddNodeOp, index: int
    ) -> None:
        """Add a new node to the graph."""
        node_spec = op.node

        # Check for duplicate name in current graph state
        # This catches edge cases like: rename A->B, then add A (would create duplicate if B was renamed back)
        if node_spec.name in graph.name_to_id:
            raise ChangeSetApplicationError(
                f"Cannot add node '{node_spec.name}': a node with that name already exists",
                operation_index=index,
            )

        # Calculate position if not provided
        position = node_spec.position
        if position is None:
            position = self._calculate_position(list(graph.nodes.values()))

        node_id = str(uuid.uuid4())
        node = Node(
            id=node_id,
            model_id=model_id,
            type=node_spec.type,
            name=node_spec.name,
            description=node_spec.description,
            properties=_serialize_json(node_spec.properties),
            position=_serialize_json(position),
            cost=_serialize_json(node_spec.cost),
        )
        self.db.add(node)

        # Flush immediately so subsequent operations (edges) can reference this node
        await self.db.flush()

        # Update graph state
        graph.nodes[node_id] = node
        graph.name_to_id[node_spec.name] = node_id

    async def _update_node(
        self, graph: GraphState, op: UpdateNodeOp, index: int
    ) -> None:
        """Update an existing node."""
        node_id = self._resolve_node_id(graph, op.node_id, index)
        node = graph.nodes.get(node_id)

        if node is None:
            raise ChangeSetApplicationError(
                f"Node '{op.node_id}' not found",
                operation_index=index,
            )

        # Apply updates
        updates = op.updates
        if "name" in updates:
            new_name = updates["name"]
            old_name = node.name

            # Check if new name conflicts with another existing node
            if new_name != old_name and new_name in graph.name_to_id:
                raise ChangeSetApplicationError(
                    f"Cannot rename node to '{new_name}': a node with that name already exists",
                    operation_index=index,
                )

            # Update name mapping
            del graph.name_to_id[old_name]
            graph.name_to_id[new_name] = node_id
            node.name = new_name

        if "type" in updates:
            node.type = updates["type"]
        if "description" in updates:
            node.description = updates["description"]
        if "position" in updates:
            node.position = _serialize_json(updates["position"])
        if "properties" in updates:
            node.properties = _serialize_json(updates["properties"])
        if "tags" in updates:
            node.tags = _serialize_json(updates["tags"])
        if "level" in updates:
            node.level = updates["level"]
        if "cost" in updates:
            node.cost = _serialize_json(updates["cost"])

    async def _delete_node(
        self, graph: GraphState, op: DeleteNodeOp, index: int
    ) -> None:
        """Delete a node and all connected edges."""
        node_id = self._resolve_node_id(graph, op.node_id, index)
        node = graph.nodes.get(node_id)

        if node is None:
            raise ChangeSetApplicationError(
                f"Node '{op.node_id}' not found",
                operation_index=index,
            )

        # Delete connected edges first
        edges_to_delete = [
            e
            for e in graph.edges.values()
            if e.source_node_id == node_id or e.target_node_id == node_id
        ]
        for edge in edges_to_delete:
            await self.db.delete(edge)
            del graph.edges[edge.id]

        # Delete node
        await self.db.delete(node)
        del graph.nodes[node_id]
        if node.name in graph.name_to_id:
            del graph.name_to_id[node.name]

    async def _add_edge(
        self, model_id: str, graph: GraphState, op: AddEdgeOp, index: int
    ) -> None:
        """Add a new edge to the graph."""
        edge_spec = op.edge

        # Resolve source and target node IDs (may be names)
        source_id = self._resolve_node_id(graph, edge_spec.source, index)
        target_id = self._resolve_node_id(graph, edge_spec.target, index)

        edge_id = str(uuid.uuid4())
        edge = Edge(
            id=edge_id,
            model_id=model_id,
            type=edge_spec.type,
            source_node_id=source_id,
            target_node_id=target_id,
            label=edge_spec.label,
            properties=_serialize_json(edge_spec.properties),
        )
        self.db.add(edge)

        # Update graph state
        graph.edges[edge_id] = edge

    async def _update_edge(
        self, graph: GraphState, op: UpdateEdgeOp, index: int
    ) -> None:
        """Update an existing edge."""
        edge = graph.edges.get(op.edge_id)

        if edge is None:
            raise ChangeSetApplicationError(
                f"Edge '{op.edge_id}' not found",
                operation_index=index,
            )

        # Apply updates
        updates = op.updates
        if "type" in updates:
            edge.type = updates["type"]
        if "label" in updates:
            edge.label = updates["label"]
        if "properties" in updates:
            edge.properties = _serialize_json(updates["properties"])
        if "source_node_id" in updates:
            source_id = self._resolve_node_id(graph, updates["source_node_id"], index)
            edge.source_node_id = source_id
        if "target_node_id" in updates:
            target_id = self._resolve_node_id(graph, updates["target_node_id"], index)
            edge.target_node_id = target_id

    async def _delete_edge(
        self, graph: GraphState, op: DeleteEdgeOp, index: int
    ) -> None:
        """Delete an edge."""
        edge = graph.edges.get(op.edge_id)

        if edge is None:
            raise ChangeSetApplicationError(
                f"Edge '{op.edge_id}' not found",
                operation_index=index,
            )

        await self.db.delete(edge)
        del graph.edges[op.edge_id]

    def _resolve_node_id(self, graph: GraphState, ref: str, index: int) -> str:
        """Resolve a node reference (ID or name) to an ID."""
        # First check if it's a direct ID
        if ref in graph.nodes:
            return ref

        # Then check if it's a name
        if ref in graph.name_to_id:
            return graph.name_to_id[ref]

        raise ChangeSetApplicationError(
            f"Node '{ref}' not found (neither as ID nor name)",
            operation_index=index,
        )

    def _calculate_position(self, existing_nodes: list[Node]) -> dict[str, float]:
        """Calculate position for a new node based on existing nodes.

        Strategy:
        - If no nodes: (100, 100)
        - Otherwise: rightmost_x + 200, average_y
        """
        if not existing_nodes:
            return {"x": 100.0, "y": 100.0}

        positions = []
        for node in existing_nodes:
            pos = _parse_json(node.position)
            if pos and isinstance(pos, dict) and "x" in pos and "y" in pos:
                positions.append(pos)

        if not positions:
            return {"x": 100.0, "y": 100.0}

        rightmost_x = max(p["x"] for p in positions)
        average_y = sum(p["y"] for p in positions) / len(positions)

        return {"x": rightmost_x + 200.0, "y": average_y}

    async def _create_changeset(
        self,
        model_id: str,
        message_id: str | None,
        source: str,
        operations: list[dict[str, Any]],
        summary: str,
    ) -> ChangeSet:
        """Create a ChangeSet record in the database."""
        changeset = ChangeSet(
            id=str(uuid.uuid4()),
            model_id=model_id,
            message_id=message_id,
            source=source,
            operations=operations,
            summary=summary,
            status="applied",
        )
        self.db.add(changeset)
        return changeset

    def _generate_summary(self, operations: list[Operation]) -> str:
        """Generate a human-readable summary of operations."""
        if not operations:
            return "No operations"

        counts = {
            "add_node": 0,
            "update_node": 0,
            "delete_node": 0,
            "add_edge": 0,
            "update_edge": 0,
            "delete_edge": 0,
        }

        for op in operations:
            counts[op.op] += 1

        parts = []
        if counts["add_node"]:
            parts.append(f"added {counts['add_node']} node(s)")
        if counts["update_node"]:
            parts.append(f"updated {counts['update_node']} node(s)")
        if counts["delete_node"]:
            parts.append(f"deleted {counts['delete_node']} node(s)")
        if counts["add_edge"]:
            parts.append(f"added {counts['add_edge']} edge(s)")
        if counts["update_edge"]:
            parts.append(f"updated {counts['update_edge']} edge(s)")
        if counts["delete_edge"]:
            parts.append(f"deleted {counts['delete_edge']} edge(s)")

        return ", ".join(parts).capitalize() if parts else "No operations"

    def _serialize_operation(self, op: Operation) -> dict[str, Any]:
        """Serialize an operation to a dict for storage."""
        return op.model_dump()

    def _serialize_nodes(self, nodes: list[Node]) -> list[dict[str, Any]]:
        """Serialize nodes for the response.

        Uses shared serializer from chat.serializers module.
        """
        return serialize_nodes(nodes)

    def _serialize_edges(self, edges: list[Edge]) -> list[dict[str, Any]]:
        """Serialize edges for the response.

        Uses shared serializer from chat.serializers module.
        """
        return serialize_edges(edges)
