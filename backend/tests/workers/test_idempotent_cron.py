from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from workers.scheduler import idempotent_cron


class TestIdempotentCron:
    @pytest.mark.asyncio
    async def test_runs_handler_when_lock_acquired(self):
        """Cron handler executes when the idempotency lock is successfully acquired."""
        mock_handler = AsyncMock()
        mock_queue = MagicMock()
        mock_queue.acquire_cron_lock.return_value = True

        wrapped = idempotent_cron("test_job", window="day")(mock_handler)

        with patch("workers.scheduler.get_service_role_client"), \
             patch("workers.scheduler.JobQueue", return_value=mock_queue):
            await wrapped()

        mock_handler.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_skips_handler_when_lock_already_held(self):
        """Cron handler is skipped when the lock is already held (job already ran)."""
        mock_handler = AsyncMock()
        mock_queue = MagicMock()
        mock_queue.acquire_cron_lock.return_value = False

        wrapped = idempotent_cron("test_job", window="day")(mock_handler)

        with patch("workers.scheduler.get_service_role_client"), \
             patch("workers.scheduler.JobQueue", return_value=mock_queue):
            await wrapped()

        mock_handler.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_lock_uses_correct_window(self):
        """Decorator passes the configured window to acquire_cron_lock."""
        mock_handler = AsyncMock()
        mock_queue = MagicMock()
        mock_queue.acquire_cron_lock.return_value = True

        wrapped = idempotent_cron("weekly_email", window="week")(mock_handler)

        with patch("workers.scheduler.get_service_role_client"), \
             patch("workers.scheduler.JobQueue", return_value=mock_queue):
            await wrapped()

        mock_queue.acquire_cron_lock.assert_called_once_with("weekly_email", window="week")
