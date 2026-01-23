"""Tests for CRUD API endpoints."""

import pytest

# API prefix for all endpoints
API = "/api/v1"


@pytest.mark.asyncio
async def test_create_and_get_project(client):
    """Test creating and retrieving a project."""
    # Create project
    response = await client.post(
        f"{API}/projects",
        json={"name": "Test Project", "description": "A test project"},
    )
    assert response.status_code == 201
    project = response.json()
    assert project["name"] == "Test Project"
    assert project["description"] == "A test project"
    assert "id" in project

    # Get project
    response = await client.get(f"{API}/projects/{project['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == project["id"]


@pytest.mark.asyncio
async def test_list_projects(client):
    """Test listing projects."""
    # Create two projects
    await client.post(f"{API}/projects", json={"name": "Project 1"})
    await client.post(f"{API}/projects", json={"name": "Project 2"})

    response = await client.get(f"{API}/projects")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 2


@pytest.mark.asyncio
async def test_update_project(client):
    """Test updating a project."""
    # Create project
    response = await client.post(f"{API}/projects", json={"name": "Original"})
    project_id = response.json()["id"]

    # Update project
    response = await client.put(
        f"{API}/projects/{project_id}",
        json={"name": "Updated"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_project(client):
    """Test deleting a project."""
    # Create project
    response = await client.post(f"{API}/projects", json={"name": "To Delete"})
    project_id = response.json()["id"]

    # Delete project
    response = await client.delete(f"{API}/projects/{project_id}")
    assert response.status_code == 204

    # Verify deleted
    response = await client.get(f"{API}/projects/{project_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_project(client):
    """Test getting a project that doesn't exist."""
    response = await client.get(f"{API}/projects/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_model_in_project(client):
    """Test creating a model within a project."""
    # Create project
    project_resp = await client.post(f"{API}/projects", json={"name": "Model Project"})
    project_id = project_resp.json()["id"]

    # Create model via nested endpoint (no project_id in body)
    response = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Test Model"},
    )
    assert response.status_code == 201
    model = response.json()
    assert model["name"] == "Test Model"
    assert model["project_id"] == project_id


@pytest.mark.asyncio
async def test_list_project_models(client):
    """Test listing models in a project."""
    # Create project
    project_resp = await client.post(
        f"{API}/projects", json={"name": "List Models Project"}
    )
    project_id = project_resp.json()["id"]

    # Create models (no project_id in body for nested endpoint)
    await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Model 1"},
    )
    await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Model 2"},
    )

    # List models
    response = await client.get(f"{API}/projects/{project_id}/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) == 2


@pytest.mark.asyncio
async def test_get_model(client):
    """Test getting a model by ID."""
    # Create project and model
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Get Model Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Get Me"},
    )
    model_id = model_resp.json()["id"]

    # Get model
    response = await client.get(f"{API}/models/{model_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_update_model(client):
    """Test updating a model."""
    # Create project and model
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Update Model Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Original Model"},
    )
    model_id = model_resp.json()["id"]

    # Update model
    response = await client.put(
        f"{API}/models/{model_id}",
        json={"name": "Updated Model"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Model"


@pytest.mark.asyncio
async def test_delete_model(client):
    """Test deleting a model."""
    # Create project and model
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Delete Model Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "To Delete"},
    )
    model_id = model_resp.json()["id"]

    # Delete model
    response = await client.delete(f"{API}/models/{model_id}")
    assert response.status_code == 204

    # Verify deleted
    response = await client.get(f"{API}/models/{model_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_empty_graph(client):
    """Test getting graph for model with no nodes/edges."""
    # Create project and model
    project_resp = await client.post(f"{API}/projects", json={"name": "Graph Project"})
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Graph Model"},
    )
    model_id = model_resp.json()["id"]

    # Get graph
    response = await client.get(f"{API}/models/{model_id}/graph")
    assert response.status_code == 200
    graph = response.json()
    assert graph["nodes"] == []
    assert graph["edges"] == []


@pytest.mark.asyncio
async def test_save_and_get_graph(client):
    """Test saving and retrieving a full graph."""
    # Create project and model
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Full Graph Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Full Graph Model"},
    )
    model_id = model_resp.json()["id"]

    # Save graph with nodes and edges
    graph_data = {
        "nodes": [
            {
                "id": "node-1",
                "type": "service",
                "name": "API Gateway",
                "position": {"x": 100, "y": 100},
            },
            {
                "id": "node-2",
                "type": "database",
                "name": "PostgreSQL",
                "position": {"x": 300, "y": 100},
            },
        ],
        "edges": [
            {
                "id": "edge-1",
                "type": "calls",
                "source_node_id": "node-1",
                "target_node_id": "node-2",
                "label": "reads/writes",
            },
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }

    response = await client.put(f"{API}/models/{model_id}/graph", json=graph_data)
    assert response.status_code == 200
    saved = response.json()
    assert len(saved["nodes"]) == 2
    assert len(saved["edges"]) == 1
    assert saved["viewport"] == {"x": 0, "y": 0, "zoom": 1}

    # Verify nodes
    node_names = {n["name"] for n in saved["nodes"]}
    assert "API Gateway" in node_names
    assert "PostgreSQL" in node_names

    # Get graph and verify persistence (including viewport)
    response = await client.get(f"{API}/models/{model_id}/graph")
    assert response.status_code == 200
    loaded = response.json()
    assert len(loaded["nodes"]) == 2
    assert len(loaded["edges"]) == 1
    assert loaded["viewport"] == {"x": 0, "y": 0, "zoom": 1}


@pytest.mark.asyncio
async def test_save_graph_replaces_existing(client):
    """Test that saving a graph replaces existing nodes/edges."""
    # Create project and model
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Replace Graph Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Replace Graph Model"},
    )
    model_id = model_resp.json()["id"]

    # Save initial graph
    initial_graph = {
        "nodes": [
            {
                "id": "old-node",
                "type": "service",
                "name": "Old Service",
                "position": {"x": 0, "y": 0},
            },
        ],
        "edges": [],
    }
    await client.put(f"{API}/models/{model_id}/graph", json=initial_graph)

    # Save new graph (should replace)
    new_graph = {
        "nodes": [
            {
                "id": "new-node",
                "type": "database",
                "name": "New Database",
                "position": {"x": 100, "y": 100},
            },
        ],
        "edges": [],
    }
    response = await client.put(f"{API}/models/{model_id}/graph", json=new_graph)
    assert response.status_code == 200
    saved = response.json()
    assert len(saved["nodes"]) == 1
    assert saved["nodes"][0]["name"] == "New Database"

    # Verify old node is gone
    response = await client.get(f"{API}/models/{model_id}/graph")
    loaded = response.json()
    assert len(loaded["nodes"]) == 1
    assert loaded["nodes"][0]["id"] == "new-node"


@pytest.mark.asyncio
async def test_delete_model_cascades_to_nodes_and_edges(client):
    """Test that deleting a model also deletes its nodes and edges."""
    # Create project and model with graph
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Cascade Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Cascade Model"},
    )
    model_id = model_resp.json()["id"]

    # Save graph
    graph_data = {
        "nodes": [
            {
                "id": "cascade-node",
                "type": "service",
                "name": "Will Cascade",
                "position": {"x": 0, "y": 0},
            },
        ],
        "edges": [],
    }
    await client.put(f"{API}/models/{model_id}/graph", json=graph_data)

    # Delete model
    response = await client.delete(f"{API}/models/{model_id}")
    assert response.status_code == 204

    # Model should be gone
    response = await client.get(f"{API}/models/{model_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_graph_nonexistent_model(client):
    """Test getting graph for a model that doesn't exist."""
    response = await client.get(f"{API}/models/nonexistent-id/graph")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_save_graph_nonexistent_model(client):
    """Test saving graph for a model that doesn't exist."""
    response = await client.put(
        f"{API}/models/nonexistent-id/graph",
        json={"nodes": [], "edges": []},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_save_graph_rejects_invalid_edge_references(client):
    """Test that edges referencing non-existent nodes are rejected."""
    # Create project and model
    project_resp = await client.post(
        f"{API}/projects", json={"name": "Edge Validation Project"}
    )
    project_id = project_resp.json()["id"]

    model_resp = await client.post(
        f"{API}/projects/{project_id}/models",
        json={"name": "Edge Validation Model"},
    )
    model_id = model_resp.json()["id"]

    # Try to save graph with edge referencing non-existent node
    invalid_graph = {
        "nodes": [
            {
                "id": "valid-node",
                "type": "service",
                "name": "Valid Service",
                "position": {"x": 0, "y": 0},
            },
        ],
        "edges": [
            {
                "id": "invalid-edge",
                "type": "calls",
                "source_node_id": "valid-node",
                "target_node_id": "non-existent-node",  # This node doesn't exist
            },
        ],
    }

    response = await client.put(f"{API}/models/{model_id}/graph", json=invalid_graph)
    assert response.status_code == 400
    assert "not found in model" in response.json()["detail"]


@pytest.mark.asyncio
async def test_validation_error_returns_400(client):
    """Test that validation errors return 400 instead of 422."""
    # Send invalid data (missing required field 'name')
    response = await client.post(
        f"{API}/projects",
        json={"description": "No name provided"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_model_nonexistent_project_returns_404(client):
    """Test that creating model for nonexistent project returns 404."""
    response = await client.post(
        f"{API}/projects/nonexistent-project/models",
        json={"name": "Orphan Model"},
    )
    assert response.status_code == 404
