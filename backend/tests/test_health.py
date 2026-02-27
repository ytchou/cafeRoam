from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestShallowHealth:
    def test_returns_ok(self):
        from main import app
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestDeepHealth:
    @patch("main.get_service_role_client")
    def test_healthy_when_db_reachable(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.limit.return_value.execute = (
            MagicMock(return_value=MagicMock(data=[{"now": "2026-01-01"}]))
        )
        mock_get_client.return_value = mock_client

        from main import app
        client = TestClient(app)
        response = client.get("/health/deep")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["checks"]["postgres"]["status"] == "healthy"
        assert "latency_ms" in data["checks"]["postgres"]

    @patch("main.get_service_role_client")
    def test_unhealthy_when_db_unreachable(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.limit.return_value.execute = (
            MagicMock(side_effect=Exception("Connection refused"))
        )
        mock_get_client.return_value = mock_client

        from main import app
        client = TestClient(app)
        response = client.get("/health/deep")

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["postgres"]["status"] == "unhealthy"
        assert "error" in data["checks"]["postgres"]
