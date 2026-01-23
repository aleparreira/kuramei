"""Pytest configuration and fixtures."""

import os

import pytest
from httpx import ASGITransport, AsyncClient

# Use shared in-memory SQLite for tests (set before importing app)
# The ?cache=shared option allows multiple connections to share the same database
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:?cache=shared"

from src.database import Base, engine  # noqa: E402
from src.main import app  # noqa: E402


@pytest.fixture(autouse=True, scope="function")
async def setup_database():
    """Create tables before each test and clean up after."""
    # Import models to register them
    from src.models.models import Edge, Model, Node  # noqa: F401
    from src.projects.models import Project  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    """Async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
