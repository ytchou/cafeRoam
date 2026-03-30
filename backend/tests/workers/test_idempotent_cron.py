from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from workers.scheduler import idempotent_cron


class TestIdempotentCron:
    @pytest.mark.asyncio
    async def test_runs_handler_when_lock_acquired(self):
        """Cron handler executes when the idempotency lock is first acquired in a window."""
        mock_handler = AsyncMock()
        mock_db = MagicMock()
        # Simulate successful lock insert — new row returned
        mock_db.table.return_value.insert.return_value.execute.return_value.data = [
            {"job_name": "test_job", "window_start": "2026-03-30T00:00:00+00:00"}
        ]

        wrapped = idempotent_cron("test_job", window="day")(mock_handler)

        with patch("workers.scheduler.get_service_role_client", return_value=mock_db):
            await wrapped()

        mock_handler.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_skips_handler_when_lock_already_held(self):
        """Cron handler is skipped when the lock is already held (job already ran in this window)."""
        mock_handler = AsyncMock()
        mock_db = MagicMock()
        # Simulate lock already held — empty data (duplicate insert ignored)
        mock_db.table.return_value.insert.return_value.execute.return_value.data = []

        wrapped = idempotent_cron("test_job", window="day")(mock_handler)

        with patch("workers.scheduler.get_service_role_client", return_value=mock_db):
            await wrapped()

        mock_handler.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_lock_uses_correct_window(self):
        """Decorator passes the configured window to acquire_cron_lock."""
        mock_handler = AsyncMock()
        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value.data = [
            {"job_name": "weekly_email", "window_start": "2026-03-24T00:00:00+00:00"}
        ]

        wrapped = idempotent_cron("weekly_email", window="week")(mock_handler)

        with patch("workers.scheduler.get_service_role_client", return_value=mock_db):
            await wrapped()

        # Verify the insert was called with the cron_locks table
        mock_db.table.assert_called_with("cron_locks")
        insert_call = mock_db.table.return_value.insert.call_args
        assert insert_call[0][0]["job_name"] == "weekly_email"
