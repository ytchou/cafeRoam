from unittest.mock import MagicMock, patch

import pytest

from workers.queue import JobQueue


class TestReclaimStuckJobs:
    @pytest.mark.asyncio
    async def test_calls_rpc_with_configured_timeout(self):
        """Reaper delegates to the reclaim_stuck_jobs RPC with the configured timeout."""
        mock_db = MagicMock()
        mock_db.rpc.return_value.execute.return_value.data = [
            {"reclaimed_count": 2, "failed_count": 1}
        ]
        queue = JobQueue(db=mock_db)

        with patch("workers.queue.settings") as mock_settings:
            mock_settings.worker_stuck_job_timeout_minutes = 15
            result = await queue.reclaim_stuck_jobs()

        mock_db.rpc.assert_called_once_with("reclaim_stuck_jobs", {"p_timeout_minutes": 15})
        assert result == (2, 1)

    @pytest.mark.asyncio
    async def test_returns_zero_counts_when_no_stuck_jobs(self):
        """Reaper returns (0, 0) when no jobs are stuck."""
        mock_db = MagicMock()
        mock_db.rpc.return_value.execute.return_value.data = [
            {"reclaimed_count": 0, "failed_count": 0}
        ]
        queue = JobQueue(db=mock_db)

        with patch("workers.queue.settings") as mock_settings:
            mock_settings.worker_stuck_job_timeout_minutes = 10
            result = await queue.reclaim_stuck_jobs()

        assert result == (0, 0)


class TestAcquireCronLock:
    def test_returns_true_when_lock_acquired(self):
        """First call in a time window acquires the lock and returns True."""
        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value.data = [
            {"job_name": "weekly_email", "window_start": "2026-03-30T00:00:00+00:00"}
        ]
        queue = JobQueue(db=mock_db)

        result = queue.acquire_cron_lock("weekly_email", window="week")
        assert result is True

    def test_returns_false_when_lock_already_held(self):
        """Second call in the same window returns False (lock already taken)."""
        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value.data = []
        queue = JobQueue(db=mock_db)

        result = queue.acquire_cron_lock("weekly_email", window="week")
        assert result is False

    @pytest.mark.asyncio
    async def test_cleanup_deletes_old_locks(self):
        """Cleanup removes cron_locks older than the specified retention via a delete query."""
        mock_db = MagicMock()
        mock_db.table.return_value.delete.return_value.lt.return_value.execute.return_value.data = []
        queue = JobQueue(db=mock_db)

        await queue.cleanup_old_cron_locks(retention_days=7)

        mock_db.table.assert_called_with("cron_locks")
        mock_db.table.return_value.delete.assert_called_once()
        lt_call = mock_db.table.return_value.delete.return_value.lt.call_args
        assert lt_call is not None
        assert lt_call[0][0] == "created_at"
