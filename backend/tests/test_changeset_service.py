"""Tests for the ChangeSet application service."""

import json

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.chat.changeset_service import (
    ChangeSetApplicationError,
    ChangeSetService,
)
from src.chat.schemas import (
    AddEdgeOp,
    AddNodeOp,
    DeleteEdgeOp,
    DeleteNodeOp,
    EdgeSpec,
    NodeSpec,
    UpdateNodeOp,
)
from src.database import async_session_maker
from src.models.models import ChangeSet, Conversation, Edge, Message, Model, Node
from src.projects.models import Project


@pytest.fixture
async def db_session() -> AsyncSession:
    """Get a database session for tests."""
    async with async_session_maker() as session:
        yield session


@pytest.fixture
async def project_and_model(db_session: AsyncSession) -> tuple[str, str]:
    """Create a project and model for testing."""
    project = Project(name="Test Project")
    db_session.add(project)
    await db_session.flush()

    model = Model(
        project_id=project.id,
        name="Test Model",
    )
    db_session.add(model)
    await db_session.commit()
    await db_session.refresh(project)
    await db_session.refresh(model)

    return project.id, model.id


class TestChangeSetService:
    """Test cases for ChangeSetService."""

    @pytest.mark.asyncio
    async def test_apply_add_node_operation(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test adding a single node."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        operations = [
            AddNodeOp(
                op="add_node",
                node=NodeSpec(
                    type="service",
                    name="API Gateway",
                    description="Main API entry point",
                ),
            )
        ]

        result = await service.apply_operations(
            model_id=model_id,
            operations=operations,
            source="chat",
        )

        # Verify changeset was created
        assert result.changeset.model_id == model_id
        assert result.changeset.source == "chat"
        assert result.changeset.status == "applied"
        assert "added 1 node" in result.changeset.summary.lower()

        # Verify node was created
        assert len(result.nodes) == 1
        assert result.nodes[0]["name"] == "API Gateway"
        assert result.nodes[0]["type"] == "service"
        assert result.nodes[0]["description"] == "Main API entry point"

        # Verify position was calculated (first node should be at 100, 100)
        assert result.nodes[0]["position"] == {"x": 100.0, "y": 100.0}

    @pytest.mark.asyncio
    async def test_apply_multiple_add_nodes(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test adding multiple nodes with position calculation."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add first node
        operations1 = [
            AddNodeOp(
                op="add_node",
                node=NodeSpec(type="service", name="Service A"),
            )
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Create new session for second batch
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                AddNodeOp(
                    op="add_node",
                    node=NodeSpec(type="database", name="Database B"),
                )
            ]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

        # Second node should be positioned to the right
        nodes_by_name = {n["name"]: n for n in result.nodes}
        assert nodes_by_name["Database B"]["position"]["x"] == 300.0  # 100 + 200

    @pytest.mark.asyncio
    async def test_apply_add_node_with_explicit_position(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test adding a node with explicit position."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        operations = [
            AddNodeOp(
                op="add_node",
                node=NodeSpec(
                    type="service",
                    name="Custom Position",
                    position={"x": 500.0, "y": 250.0},
                ),
            )
        ]

        result = await service.apply_operations(model_id=model_id, operations=operations)

        assert result.nodes[0]["position"] == {"x": 500.0, "y": 250.0}

    @pytest.mark.asyncio
    async def test_apply_add_edge_operation(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test adding an edge between nodes."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        operations = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
            AddNodeOp(op="add_node", node=NodeSpec(type="database", name="Postgres")),
            AddEdgeOp(
                op="add_edge",
                edge=EdgeSpec(
                    source="API",
                    target="Postgres",
                    type="reads",
                    label="queries",
                ),
            ),
        ]

        result = await service.apply_operations(model_id=model_id, operations=operations)

        # Verify nodes and edge were created
        assert len(result.nodes) == 2
        assert len(result.edges) == 1

        edge = result.edges[0]
        assert edge["type"] == "reads"
        assert edge["label"] == "queries"

    @pytest.mark.asyncio
    async def test_apply_update_node_operation(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test updating an existing node."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # First add a node
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Old Name"))
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Then update it in a new session
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                UpdateNodeOp(
                    op="update_node",
                    node_id="Old Name",  # Reference by name
                    updates={"name": "New Name", "description": "Updated description"},
                )
            ]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

        # Verify update was applied
        assert len(result.nodes) == 1
        assert result.nodes[0]["name"] == "New Name"
        assert result.nodes[0]["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_apply_delete_node_operation(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test deleting a node removes connected edges."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add nodes and edge
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="A")),
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="B")),
            AddEdgeOp(op="add_edge", edge=EdgeSpec(source="A", target="B", type="calls")),
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Delete node A in new session
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [DeleteNodeOp(op="delete_node", node_id="A")]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

        # Verify node A and its edge were deleted
        assert len(result.nodes) == 1
        assert result.nodes[0]["name"] == "B"
        assert len(result.edges) == 0

    @pytest.mark.asyncio
    async def test_apply_delete_edge_operation(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test deleting an edge."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add nodes and edge
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="A")),
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="B")),
            AddEdgeOp(op="add_edge", edge=EdgeSpec(source="A", target="B", type="calls")),
        ]
        result1 = await service.apply_operations(model_id=model_id, operations=operations1)

        edge_id = result1.edges[0]["id"]

        # Delete the edge in new session
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [DeleteEdgeOp(op="delete_edge", edge_id=edge_id)]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

        # Verify edge was deleted but nodes remain
        assert len(result.nodes) == 2
        assert len(result.edges) == 0

    @pytest.mark.asyncio
    async def test_atomicity_on_failure(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that all operations are rolled back on failure."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Try to add a node and then reference a non-existent node
        operations = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Valid Node")),
            # This should fail - NonExistent doesn't exist
            AddEdgeOp(
                op="add_edge",
                edge=EdgeSpec(source="Valid Node", target="NonExistent", type="calls"),
            ),
        ]

        with pytest.raises(ChangeSetApplicationError):
            await service.apply_operations(model_id=model_id, operations=operations)

        # Verify nothing was committed (need new session to check)
        async with async_session_maker() as session2:
            result = await session2.execute(
                select(Node).where(Node.model_id == model_id)
            )
            nodes = result.scalars().all()
            assert len(nodes) == 0  # Rolled back

    @pytest.mark.asyncio
    async def test_empty_operations_list(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test applying empty operations list creates changeset but no changes."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        result = await service.apply_operations(
            model_id=model_id,
            operations=[],
            source="manual",
        )

        assert result.changeset.summary == "No operations to apply"
        assert len(result.nodes) == 0
        assert len(result.edges) == 0

        # Verify changeset was persisted (regression test for P2 fix)
        async with async_session_maker() as session2:
            cs_result = await session2.execute(
                select(ChangeSet).where(ChangeSet.id == result.changeset.id)
            )
            changeset = cs_result.scalar_one_or_none()
            assert changeset is not None
            assert changeset.summary == "No operations to apply"

    @pytest.mark.asyncio
    async def test_empty_operations_validates_model_exists(
        self, db_session: AsyncSession
    ):
        """Test that empty operations still validates model existence."""
        service = ChangeSetService(db_session)

        with pytest.raises(ChangeSetApplicationError) as exc_info:
            await service.apply_operations(
                model_id="nonexistent-model-id",
                operations=[],
            )

        assert "not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_validation_rejects_duplicate_node_name(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that adding duplicate node names fails validation."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add a node first
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Duplicate"))
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Try to add another node with the same name in new session
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                AddNodeOp(op="add_node", node=NodeSpec(type="database", name="Duplicate"))
            ]

            with pytest.raises(ChangeSetApplicationError) as exc_info:
                await service2.apply_operations(
                    model_id=model_id, operations=operations2
                )

            assert "already exists" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_changeset_stores_message_id(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that message_id is stored in changeset."""
        _, model_id = project_and_model

        # Create a conversation and message first (FK constraint)
        conversation = Conversation(model_id=model_id, title="Test Conversation")
        db_session.add(conversation)
        await db_session.flush()

        message = Message(
            conversation_id=conversation.id, role="user", content="Test message"
        )
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        message_id = message.id

        service = ChangeSetService(db_session)

        operations = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Test"))
        ]

        result = await service.apply_operations(
            model_id=model_id,
            operations=operations,
            message_id=message_id,
            source="chat",
        )

        assert result.changeset.message_id == message_id

    @pytest.mark.asyncio
    async def test_model_not_found_error(self, db_session: AsyncSession):
        """Test error when model doesn't exist."""
        service = ChangeSetService(db_session)

        operations = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Test"))
        ]

        with pytest.raises(ChangeSetApplicationError) as exc_info:
            await service.apply_operations(
                model_id="nonexistent-model-id",
                operations=operations,
            )

        assert "not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_changeset_persisted_in_database(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that changeset is persisted in database."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        operations = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Test")),
            AddNodeOp(op="add_node", node=NodeSpec(type="database", name="DB")),
        ]

        result = await service.apply_operations(model_id=model_id, operations=operations)

        # Verify changeset is in database
        async with async_session_maker() as session2:
            cs_result = await session2.execute(
                select(ChangeSet).where(ChangeSet.id == result.changeset.id)
            )
            changeset = cs_result.scalar_one()

            assert changeset.model_id == model_id
            assert changeset.source == "chat"
            assert changeset.status == "applied"
            assert len(changeset.operations) == 2
            assert "added 2 node" in changeset.summary.lower()

    @pytest.mark.asyncio
    async def test_rename_node_to_existing_name_fails(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that renaming a node to an existing name fails (P1 fix)."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add two nodes
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="NodeA")),
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="NodeB")),
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Try to rename NodeA to NodeB (should fail)
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                UpdateNodeOp(
                    op="update_node",
                    node_id="NodeA",
                    updates={"name": "NodeB"},  # Conflict!
                )
            ]

            with pytest.raises(ChangeSetApplicationError) as exc_info:
                await service2.apply_operations(
                    model_id=model_id, operations=operations2
                )

            assert "already exists" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_rename_node_to_same_name_succeeds(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that renaming a node to its own name is allowed (no-op)."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add a node
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="NodeA"))
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Rename NodeA to NodeA (should succeed)
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                UpdateNodeOp(
                    op="update_node",
                    node_id="NodeA",
                    updates={"name": "NodeA"},  # Same name
                )
            ]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

            assert len(result.nodes) == 1
            assert result.nodes[0]["name"] == "NodeA"

    @pytest.mark.asyncio
    async def test_rename_then_add_same_name_fails(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test that rename followed by add of same name in batch fails (P2 fix)."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add initial node
        operations1 = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="Original"))
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Try to rename Original->NewName and then add a new node also called NewName
        # This should fail because after rename, NewName already exists
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                UpdateNodeOp(
                    op="update_node",
                    node_id="Original",
                    updates={"name": "NewName"},
                ),
                AddNodeOp(
                    op="add_node",
                    node=NodeSpec(type="database", name="NewName"),  # Duplicate!
                ),
            ]

            with pytest.raises(ChangeSetApplicationError) as exc_info:
                await service2.apply_operations(
                    model_id=model_id, operations=operations2
                )

            assert "already exists" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_add_node_with_cost(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test adding a node with cost information."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        cost_data = {
            "monthlyUSD": 150.00,
            "confidence": "estimated",
            "breakdown": {"compute": 100.00, "storage": 50.00},
        }

        operations = [
            AddNodeOp(
                op="add_node",
                node=NodeSpec(
                    type="database",
                    name="PostgreSQL",
                    description="Main database",
                    cost=cost_data,
                ),
            )
        ]

        result = await service.apply_operations(
            model_id=model_id,
            operations=operations,
            source="chat",
        )

        # Verify node was created with cost
        assert len(result.nodes) == 1
        assert result.nodes[0]["name"] == "PostgreSQL"
        assert result.nodes[0]["cost"] == cost_data
        assert result.nodes[0]["cost"]["monthlyUSD"] == 150.00
        assert result.nodes[0]["cost"]["confidence"] == "estimated"
        assert result.nodes[0]["cost"]["breakdown"]["compute"] == 100.00

    @pytest.mark.asyncio
    async def test_update_node_cost(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test updating a node's cost information."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # First add a node without cost
        operations1 = [
            AddNodeOp(
                op="add_node",
                node=NodeSpec(type="service", name="API Gateway"),
            )
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Update with cost in a new session
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            new_cost = {
                "monthlyUSD": 75.00,
                "confidence": "actual",
            }
            operations2 = [
                UpdateNodeOp(
                    op="update_node",
                    node_id="API Gateway",
                    updates={"cost": new_cost},
                )
            ]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

        # Verify cost was updated
        assert len(result.nodes) == 1
        assert result.nodes[0]["name"] == "API Gateway"
        assert result.nodes[0]["cost"] == new_cost
        assert result.nodes[0]["cost"]["monthlyUSD"] == 75.00
        assert result.nodes[0]["cost"]["confidence"] == "actual"

    @pytest.mark.asyncio
    async def test_update_node_cost_to_null(
        self, db_session: AsyncSession, project_and_model: tuple[str, str]
    ):
        """Test clearing a node's cost information."""
        _, model_id = project_and_model
        service = ChangeSetService(db_session)

        # Add a node with cost
        operations1 = [
            AddNodeOp(
                op="add_node",
                node=NodeSpec(
                    type="service",
                    name="Expensive Service",
                    cost={"monthlyUSD": 500.00, "confidence": "estimated"},
                ),
            )
        ]
        await service.apply_operations(model_id=model_id, operations=operations1)

        # Clear cost in a new session
        async with async_session_maker() as session2:
            service2 = ChangeSetService(session2)
            operations2 = [
                UpdateNodeOp(
                    op="update_node",
                    node_id="Expensive Service",
                    updates={"cost": None},
                )
            ]
            result = await service2.apply_operations(
                model_id=model_id, operations=operations2
            )

        # Verify cost was cleared
        assert len(result.nodes) == 1
        assert result.nodes[0]["name"] == "Expensive Service"
        assert result.nodes[0]["cost"] is None
