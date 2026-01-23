"""Pytest configuration and fixtures."""

import os

import pytest
from httpx import ASGITransport, AsyncClient

# Use shared in-memory SQLite for tests (set before importing app)
# The ?cache=shared option allows multiple connections to share the same database
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:?cache=shared"

from src.main import app  # noqa: E402


@pytest.fixture
async def client():
    """Async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
