import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from middleware.bot_detection import BotDetectionMiddleware

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_BROWSER_HEADERS = {
    "user-agent": _BROWSER_UA,
    "accept": "text/html",
    "accept-language": "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
}


@pytest.fixture
def app_with_bot_detection():
    app = FastAPI()
    app.add_middleware(BotDetectionMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"ok": True}

    @app.get("/health")
    async def health_endpoint():
        return {"status": "ok"}

    return app


@pytest.fixture
def client(app_with_bot_detection):
    return TestClient(app_with_bot_detection)


class TestBotDetection:
    def test_allows_normal_browser_request(self, client):
        response = client.get("/test", headers=_BROWSER_HEADERS)
        assert response.status_code == 200
        assert "X-Bot-Suspect" not in response.headers

    def test_blocks_empty_user_agent(self, client):
        response = client.get("/test", headers={"user-agent": ""})
        assert response.status_code == 403

    def test_blocks_missing_user_agent(self, client):
        response = client.get("/test", headers={k: v for k, v in _BROWSER_HEADERS.items() if k != "user-agent"})
        assert response.status_code == 403

    def test_blocks_curl_user_agent(self, client):
        response = client.get("/test", headers={"user-agent": "curl/7.68.0"})
        assert response.status_code == 403

    def test_blocks_python_requests_user_agent(self, client):
        response = client.get("/test", headers={"user-agent": "python-requests/2.28.0"})
        assert response.status_code == 403

    def test_blocks_scrapy_user_agent(self, client):
        response = client.get("/test", headers={"user-agent": "Scrapy/2.8.0"})
        assert response.status_code == 403

    def test_blocks_wget_user_agent(self, client):
        response = client.get("/test", headers={"user-agent": "Wget/1.21"})
        assert response.status_code == 403

    def test_allows_googlebot(self, client):
        response = client.get("/test", headers={"user-agent": "Googlebot/2.1"})
        assert response.status_code == 200

    def test_allows_bingbot(self, client):
        response = client.get(
            "/test", headers={"user-agent": "Mozilla/5.0 (compatible; Bingbot/2.0)"}
        )
        assert response.status_code == 200

    def test_blocklist_case_insensitive(self, client):
        response = client.get("/test", headers={"user-agent": "CURL/7.68.0"})
        assert response.status_code == 403

    def test_flags_suspicious_missing_accept_headers(self, client):
        """Request with a browser-like UA but missing Accept/Accept-Language headers."""
        response = client.get("/test", headers={"user-agent": _BROWSER_UA})
        assert response.status_code == 200
        assert response.headers.get("X-Bot-Suspect") == "1"

    def test_skips_health_endpoints(self, client):
        response = client.get("/health", headers={"user-agent": "curl/7.68.0"})
        assert response.status_code == 200

    def test_disabled_via_config(self, client, monkeypatch):
        from core.config import settings

        monkeypatch.setattr(settings, "bot_detection_enabled", False)
        response = client.get("/test", headers={"user-agent": "curl/7.68.0"})
        assert response.status_code == 200
