#!/usr/bin/env python3
"""Seed script to populate database with demo project 'SaaS Startup Architecture'.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/seed_demo.py

This script is idempotent - running it multiple times won't create duplicates.
Uses deterministic UUIDs via uuid.uuid5 to ensure consistent IDs across runs.
"""

import asyncio
import json
import sys
import uuid
from pathlib import Path

# Add backend root to path so we can import from src
backend_root = Path(__file__).parent.parent
sys.path.insert(0, str(backend_root))

from sqlalchemy import select  # noqa: E402

from src.database import async_session_maker, init_db  # noqa: E402
from src.models.models import Edge, Model, Node  # noqa: E402
from src.projects.models import Project  # noqa: E402

# Namespace for deterministic UUID generation
NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # DNS namespace

# Demo project constants
DEMO_PROJECT_NAME = "SaaS Startup Architecture"
DEMO_MODEL_NAME = "Main Architecture"


def make_id(key: str) -> str:
    """Generate deterministic UUID from key string."""
    return str(uuid.uuid5(NAMESPACE, key))


# Pre-generate all IDs for consistency
PROJECT_ID = make_id("demo-project")
MODEL_ID = make_id("demo-model")

# Node IDs
API_GATEWAY_ID = make_id("api-gateway")
ORDER_SERVICE_ID = make_id("order-service")
POSTGRESQL_ID = make_id("postgresql")
RABBITMQ_ID = make_id("rabbitmq")
REDIS_CACHE_ID = make_id("redis-cache")

# Edge IDs
EDGE_API_ORDER_ID = make_id("edge-api-order")
EDGE_ORDER_POSTGRES_ID = make_id("edge-order-postgres")
EDGE_ORDER_RABBIT_ID = make_id("edge-order-rabbit")
EDGE_ORDER_REDIS_ID = make_id("edge-order-redis")


async def demo_exists(session) -> bool:
    """Check if demo project already exists."""
    result = await session.execute(select(Project).where(Project.id == PROJECT_ID))
    return result.scalar_one_or_none() is not None


async def create_demo_project(session) -> Project:
    """Create the demo project."""
    project = Project(
        id=PROJECT_ID,
        name=DEMO_PROJECT_NAME,
        description="A sample SaaS architecture demonstrating microservices patterns "
        "with API Gateway, Order Service, PostgreSQL, RabbitMQ, and Redis Cache.",
        default_cloud="aws",
        iac_tool="terraform",
    )
    session.add(project)
    return project


async def create_demo_model(session) -> Model:
    """Create the demo model."""
    model = Model(
        id=MODEL_ID,
        project_id=PROJECT_ID,
        name=DEMO_MODEL_NAME,
        description="Main architecture model showing service interactions",
        status="draft",
        version="1.0.0",
        viewport=json.dumps({"x": 0, "y": 0, "zoom": 1}),
    )
    session.add(model)
    return model


async def create_demo_nodes(session) -> list[Node]:
    """Create the demo nodes.

    Layout:
        API Gateway ──calls──> Order Service
                                    │
                              ┌─────┴─────┐
                              │           │
                        reads/writes   publishes
                              │           │
                              v           v
                        PostgreSQL    RabbitMQ
                              │
                         reads│
                              v
                        Redis Cache
    """
    nodes_data = [
        {
            "id": API_GATEWAY_ID,
            "type": "gateway",
            "name": "API Gateway",
            "description": "Entry point for all client requests. Routes to appropriate services.",
            "position": {"x": 100, "y": 100},
            "properties": {"protocol": "HTTPS", "auth": "JWT"},
        },
        {
            "id": ORDER_SERVICE_ID,
            "type": "service",
            "name": "Order Service",
            "description": "Handles order creation, updates, and queries.",
            "position": {"x": 350, "y": 100},
            "properties": {"runtime": "Node.js", "replicas": 3},
        },
        {
            "id": POSTGRESQL_ID,
            "type": "database",
            "name": "PostgreSQL",
            "description": "Primary database for order data persistence.",
            "position": {"x": 250, "y": 300},
            "properties": {"engine": "PostgreSQL 15", "storage": "100GB"},
        },
        {
            "id": RABBITMQ_ID,
            "type": "queue",
            "name": "RabbitMQ",
            "description": "Message broker for async event processing.",
            "position": {"x": 450, "y": 300},
            "properties": {"protocol": "AMQP", "durable": True},
        },
        {
            "id": REDIS_CACHE_ID,
            "type": "database",
            "name": "Redis Cache",
            "description": "In-memory cache for frequently accessed order data.",
            "position": {"x": 250, "y": 500},
            "properties": {"engine": "Redis 7", "maxmemory": "1GB"},
        },
    ]

    nodes = []
    for data in nodes_data:
        node = Node(
            id=data["id"],
            model_id=MODEL_ID,
            type=data["type"],
            name=data["name"],
            description=data.get("description"),
            position=json.dumps(data["position"]),
            properties=json.dumps(data.get("properties", {})),
            level="L2",
        )
        session.add(node)
        nodes.append(node)

    return nodes


async def create_demo_edges(session) -> list[Edge]:
    """Create the demo edges connecting nodes."""
    edges_data = [
        {
            "id": EDGE_API_ORDER_ID,
            "type": "calls",
            "source_node_id": API_GATEWAY_ID,
            "target_node_id": ORDER_SERVICE_ID,
            "label": "routes requests",
            "properties": {"protocol": "HTTP/2", "auth": "JWT"},
        },
        {
            "id": EDGE_ORDER_POSTGRES_ID,
            "type": "reads",
            "source_node_id": ORDER_SERVICE_ID,
            "target_node_id": POSTGRESQL_ID,
            "label": "reads/writes orders",
            "properties": {"protocol": "PostgreSQL", "pool_size": 10},
        },
        {
            "id": EDGE_ORDER_RABBIT_ID,
            "type": "publishes",
            "source_node_id": ORDER_SERVICE_ID,
            "target_node_id": RABBITMQ_ID,
            "label": "order events",
            "properties": {"exchange": "orders", "routing_key": "order.*"},
        },
        {
            "id": EDGE_ORDER_REDIS_ID,
            "type": "reads",
            "source_node_id": ORDER_SERVICE_ID,
            "target_node_id": REDIS_CACHE_ID,
            "label": "cache lookups",
            "properties": {"ttl": 300},
        },
    ]

    edges = []
    for data in edges_data:
        edge = Edge(
            id=data["id"],
            model_id=MODEL_ID,
            type=data["type"],
            source_node_id=data["source_node_id"],
            target_node_id=data["target_node_id"],
            label=data.get("label"),
            properties=json.dumps(data.get("properties", {})),
        )
        session.add(edge)
        edges.append(edge)

    return edges


async def seed_demo():
    """Main function to seed the demo project."""
    print("Initializing database...")
    await init_db()

    async with async_session_maker() as session:
        # Check if demo already exists
        if await demo_exists(session):
            print(f"Demo project '{DEMO_PROJECT_NAME}' already exists. Skipping.")
            return

        print(f"Creating demo project: {DEMO_PROJECT_NAME}")

        # Create entities in order with flushes to satisfy FK constraints
        await create_demo_project(session)
        await session.flush()

        await create_demo_model(session)
        await session.flush()

        nodes = await create_demo_nodes(session)
        await session.flush()

        edges = await create_demo_edges(session)

        # Commit all changes
        await session.commit()

        print(f"Created project with ID: {PROJECT_ID}")
        print(f"Created model with ID: {MODEL_ID}")
        print(f"Created {len(nodes)} nodes:")
        for node in nodes:
            print(f"  - {node.name} ({node.type})")
        print(f"Created {len(edges)} edges:")
        for edge in edges:
            print(f"  - {edge.type}: {edge.label}")

        print("\nDemo seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_demo())
