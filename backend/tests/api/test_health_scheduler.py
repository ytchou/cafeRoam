from unittest.mock import MagicMock

from fastapi.testclient import TestClient

import main
from api.deps import require_admin


class TestHealthScheduler:
    def test_scheduler_health_reports_registered_jobs(self):
        """When the scheduler has running jobs, the health endpoint reports their IDs and next run times."""
        mock_job = MagicMock()
        mock_job.id = "poll_pending_jobs"
        mock_job.next_run_time = None

        # Override admin auth — test infrastructure, not auth logic
        main.app.dependency_overrides[require_admin] = lambda: {"id": "test-admin"}
        # Set scheduler on app state (normally set in lifespan on startup)
        main.app.state.scheduler = main.scheduler

        try:
            # Mock at APScheduler's get_jobs boundary (third-party library)
            original_get_jobs = main.scheduler.get_jobs
            main.scheduler.get_jobs = lambda: [mock_job] * 6  # type: ignore[method-assign]
            try:
                client = TestClient(main.app)
                response = client.get("/health/scheduler")
            finally:
                main.scheduler.get_jobs = original_get_jobs
        finally:
            main.app.dependency_overrides.pop(require_admin, None)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["registered_jobs"] == 6
        assert "jobs" in data
        assert "last_poll_at" in data
