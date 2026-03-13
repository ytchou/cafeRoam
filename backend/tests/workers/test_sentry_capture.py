from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import Job, JobStatus, JobType


class TestJobFailureSentryCapture:
    @pytest.mark.asyncio
    @patch("workers.scheduler.sentry_sdk")
    @patch("workers.scheduler.get_service_role_client")
    async def test_captures_exception_on_job_failure(self, mock_get_client, mock_sentry):
        """When a job fails during execution, the exception is sent to Sentry."""
        from workers.scheduler import _run_job

        mock_get_client.return_value = MagicMock()
        error = Exception("Enrichment failed")

        with (
            patch("workers.scheduler.JobQueue") as mock_queue_cls,
            patch("workers.scheduler._dispatch_job", new_callable=AsyncMock, side_effect=error),
        ):
            mock_queue = AsyncMock()
            mock_queue_cls.return_value = mock_queue
            job = Job(
                id="job-1",
                job_type=JobType.ENRICH_SHOP,
                payload={"shop_id": "shop-1"},
                status=JobStatus.CLAIMED,
                attempts=1,
                scheduled_at=datetime(2026, 1, 1, tzinfo=UTC),
                created_at=datetime(2026, 1, 1, tzinfo=UTC),
            )

            await _run_job(job)

            mock_sentry.capture_exception.assert_called_once_with(error)
            mock_queue.fail.assert_called_once()
