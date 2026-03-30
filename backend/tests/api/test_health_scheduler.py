from unittest.mock import patch

from fastapi.testclient import TestClient


class TestHealthScheduler:
    def test_returns_scheduler_status(self):
        """GET /health/scheduler returns job count and last poll timestamp."""
        mock_status = {
            "status": "ok",
            "registered_jobs": 6,
            "jobs": [
                {"id": "poll_pending_jobs", "next_run": "2026-03-30 12:00:05+08:00"},
                {"id": "staleness_sweep", "next_run": "2026-03-31 03:00:00+08:00"},
            ],
            "last_poll_at": "2026-03-30T04:00:00+00:00",
        }
        with patch("main.get_scheduler_status", return_value=mock_status):
            from main import app

            client = TestClient(app)
            response = client.get("/health/scheduler")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["registered_jobs"] == 6
        assert "jobs" in data
        assert "last_poll_at" in data
