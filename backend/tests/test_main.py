"""Tests for main FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


def test_health_endpoint(client: TestClient) -> None:
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_endpoint_async(async_client: AsyncClient) -> None:
    """Test the health check endpoint with async client."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_options_request_openai(client: TestClient) -> None:
    """Test OPTIONS request for CORS preflight on OpenAI endpoint."""
    response = client.options("/openai/chat/completions")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_options_request_proxy(client: TestClient) -> None:
    """Test OPTIONS request for CORS preflight on proxy endpoint."""
    response = client.options("/proxy/weather/current.json")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_proxy_not_configured(client: TestClient) -> None:
    """Test accessing a non-configured proxy path."""
    response = client.get("/proxy/nonexistent/path")
    assert response.status_code == 404
    assert response.json()["detail"] == "Proxy path not configured"


def test_openai_proxy_without_config(client: TestClient) -> None:
    """Test OpenAI proxy when not configured."""
    # This test assumes DEEPINFRA_API_KEY is not set in test environment
    # You might need to mock the settings for this test
    response = client.post("/openai/chat/completions", json={})
    # Should either return 404 if not configured or pass through to the API
    assert response.status_code in [404, 401, 422]
