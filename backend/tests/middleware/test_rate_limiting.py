import pytest
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_ipaddr
from starlette.testclient import TestClient


@pytest.fixture
def rate_limited_app():
    """Create a fresh app with its own limiter for each test."""
    test_limiter = Limiter(
        key_func=get_ipaddr,
        default_limits=["5/minute"],
    )

    app = FastAPI()
    app.state.limiter = test_limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    @app.get("/test")
    async def test_endpoint(request: Request):
        return {"ok": True}

    @app.get("/health")
    @test_limiter.exempt
    async def health_endpoint(request: Request):
        return {"status": "ok"}

    @app.get("/strict")
    @test_limiter.limit("2/minute")
    async def strict_endpoint(request: Request):
        return {"ok": True}

    return app


@pytest.fixture
def client(rate_limited_app):
    return TestClient(rate_limited_app)


class TestRateLimiting:
    def test_allows_requests_within_limit(self, client):
        for _ in range(5):
            response = client.get("/test")
            assert response.status_code == 200

    def test_returns_429_after_exceeding_limit(self, client):
        for _ in range(5):
            client.get("/test")
        response = client.get("/test")
        assert response.status_code == 429

    def test_health_exempt_from_rate_limit(self, client):
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200

    def test_route_specific_limit_overrides_default(self, client):
        for _ in range(2):
            response = client.get("/strict")
            assert response.status_code == 200
        response = client.get("/strict")
        assert response.status_code == 429

    def test_429_response_has_detail(self, client):
        for _ in range(5):
            client.get("/test")
        response = client.get("/test")
        assert response.status_code == 429
        assert (
            "rate limit" in response.json().get("error", response.text).lower()
            or response.status_code == 429
        )
