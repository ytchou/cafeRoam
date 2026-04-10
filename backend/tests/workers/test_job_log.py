from unittest.mock import MagicMock

from workers.job_log import log_job_event


def test_log_job_event_inserts_row():
    """log_job_event inserts a row with correct columns into job_logs."""
    mock_db = MagicMock()
    insert_mock = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value = insert_mock

    log_job_event(mock_db, "abc-123", "info", "test message", shop_id="s1")

    mock_db.table.assert_called_once_with("job_logs")
    mock_db.table.return_value.insert.assert_called_once_with({
        "job_id": "abc-123",
        "level": "info",
        "message": "test message",
        "context": {"shop_id": "s1"},
    })
    mock_db.table.return_value.insert.return_value.execute.assert_called_once()


def test_log_job_event_swallows_db_error():
    """log_job_event does not raise when the DB insert fails."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.side_effect = Exception("DB down")

    # Should not raise
    log_job_event(mock_db, "abc-123", "error", "something failed")
