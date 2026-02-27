import uuid

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from middleware.request_id import RequestIDMiddleware


@pytest.fixture
def app_with_middleware():
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"ok": True}

    @app.get("/health")
    async def health_endpoint():
        return {"status": "ok"}

    return app


@pytest.fixture
def client(app_with_middleware):
    return TestClient(app_with_middleware)


class TestRequestIDMiddleware:
    def test_adds_request_id_header_to_response(self, client):
        response = client.get("/test")
        assert "X-Request-ID" in response.headers
        # Verify it's a valid UUID
        uuid.UUID(response.headers["X-Request-ID"])

    def test_unique_ids_per_request(self, client):
        r1 = client.get("/test")
        r2 = client.get("/test")
        assert r1.headers["X-Request-ID"] != r2.headers["X-Request-ID"]

    def test_skips_health_endpoints(self, client):
        """Health check requests should not be logged (but still get request IDs)."""
        response = client.get("/health")
        assert response.status_code == 200
        # Still gets a request ID header
        assert "X-Request-ID" in response.headers

    def test_honors_incoming_request_id(self, client):
        """If caller sends X-Request-ID, echo it back unchanged."""
        custom_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.get("/test", headers={"x-request-id": custom_id})
        assert response.headers["X-Request-ID"] == custom_id
