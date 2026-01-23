"""Tests for health endpoint."""

import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    """Test that /health returns status ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_cors_preflight(client):
    """Test CORS preflight request for localhost:3001."""
    response = await client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3001",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3001"
