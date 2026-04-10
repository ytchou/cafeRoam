from unittest.mock import MagicMock

import pytest

from workers.job_log import log_job_event


@pytest.mark.asyncio
async def test_log_job_event_inserts_row():
    """Given a running job, when a milestone event is logged, the job_logs table receives the correct row."""
    mock_db = MagicMock()
    insert_mock = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value = insert_mock

    await log_job_event(mock_db, "abc-123", "info", "test message", shop_id="s1")

    mock_db.table.assert_called_once_with("job_logs")
    mock_db.table.return_value.insert.assert_called_once_with(
        {
            "job_id": "abc-123",
            "level": "info",
            "message": "test message",
            "context": {"shop_id": "s1"},
        }
    )
    mock_db.table.return_value.insert.return_value.execute.assert_called_once()


@pytest.mark.asyncio
async def test_log_job_event_swallows_db_error():
    """Given a DB failure, when log_job_event is called, it does not raise so callers are unaffected."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.side_effect = Exception("DB down")

    # Should not raise
    await log_job_event(mock_db, "abc-123", "error", "something failed")
