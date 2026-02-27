from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import Job, JobStatus, JobType


class TestJobFailureSentryCapture:
    @pytest.mark.asyncio
    @patch("workers.scheduler.sentry_sdk")
    @patch("workers.scheduler.get_service_role_client")
    async def test_captures_exception_on_job_failure(
        self, mock_get_client, mock_sentry
    ):
        """When a job fails, the exception should be sent to Sentry with context."""
        from workers.scheduler import process_job_queue

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        error = Exception("Enrichment failed")
        with patch("workers.scheduler.JobQueue") as MockQueue:
            mock_queue = AsyncMock()
            MockQueue.return_value = mock_queue
            mock_queue.claim.return_value = Job(
                id="job-1",
                job_type=JobType.ENRICH_SHOP,
                payload={"shop_id": "shop-1"},
                status=JobStatus.CLAIMED,
                attempts=1,
                scheduled_at=datetime(2026, 1, 1),
                created_at=datetime(2026, 1, 1),
            )

            # Make the handler raise by failing to get taxonomy
            mock_client.table.return_value.select.return_value.execute.side_effect = error

            await process_job_queue()

            # Sentry should capture the exception
            mock_sentry.capture_exception.assert_called_once_with(error)
            # Job should also be marked as failed
            mock_queue.fail.assert_called_once()
