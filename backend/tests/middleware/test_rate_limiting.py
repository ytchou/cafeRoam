import jwt as pyjwt
import pytest
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_ipaddr
from starlette.requests import Request as StarletteRequest
from starlette.testclient import TestClient

from middleware.rate_limit import get_user_id_or_ip


def _make_request(headers: dict[str, str] | None = None) -> StarletteRequest:
    """Build a minimal Starlette Request with the given headers and a known client IP."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "query_string": b"",
        "server": ("127.0.0.1", 80),
        "client": ("1.2.3.4", 12345),
    }
    return StarletteRequest(scope)


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
        body = response.json()
        message = body.get("detail") or body.get("error") or ""
        assert "rate limit" in message.lower()


class TestGetUserIdOrIp:
    def test_extracts_user_id_from_valid_bearer_jwt(self):
        """A request with a valid Bearer JWT returns the sub claim as the rate-limit key."""
        token = pyjwt.encode({"sub": "user-abc-123"}, "secret", algorithm="HS256")
        request = _make_request({"Authorization": f"Bearer {token}"})
        assert get_user_id_or_ip(request) == "user:user-abc-123"

    def test_falls_back_to_ip_when_jwt_has_no_sub(self):
        """A JWT without a sub field falls back to the client IP."""
        token = pyjwt.encode({"email": "coffee@caferoam.tw"}, "secret", algorithm="HS256")
        request = _make_request({"Authorization": f"Bearer {token}"})
        assert get_user_id_or_ip(request) == "1.2.3.4"

    def test_falls_back_to_ip_on_malformed_jwt(self):
        """A malformed Bearer token falls back to the client IP without raising."""
        request = _make_request({"Authorization": "Bearer not.a.real.token"})
        assert get_user_id_or_ip(request) == "1.2.3.4"

    def test_falls_back_to_ip_when_no_auth_header(self):
        """A request with no Authorization header uses the client IP."""
        request = _make_request()
        assert get_user_id_or_ip(request) == "1.2.3.4"
