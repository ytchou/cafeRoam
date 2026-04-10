from unittest.mock import MagicMock

from models.types import JobStatus
from workers.job_guard import check_job_still_claimed
from workers.queue import get_status


def _mock_db_with_status(status: str | None) -> MagicMock:
    mock_db = MagicMock()
    if status is None:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[])
        )
    else:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"status": status}])
        )
    return mock_db


def test_guard_allows_worker_to_continue_when_job_is_still_claimed():
    """Given a worker holding a claimed job, when the guard runs, it reports the job is active."""
    mock_db = _mock_db_with_status("claimed")
    result = check_job_still_claimed(mock_db, "job-id-1")
    assert result is True


def test_guard_blocks_write_when_admin_cancelled_the_job_mid_flight():
    """Given an admin who cancelled a job while the worker was processing, the guard detects it."""
    mock_db = _mock_db_with_status("cancelled")
    result = check_job_still_claimed(mock_db, "job-id-2")
    assert result is False


def test_guard_blocks_write_when_job_reached_dead_letter():
    """Given a job that moved to dead_letter, when the guard runs, it signals the worker to abort."""
    mock_db = _mock_db_with_status("dead_letter")
    result = check_job_still_claimed(mock_db, "job-id-3")
    assert result is False


def test_guard_blocks_write_when_job_no_longer_exists():
    """Given a job that was deleted from the queue, when the guard runs, it signals the worker to abort."""
    mock_db = _mock_db_with_status(None)
    result = check_job_still_claimed(mock_db, "job-id-missing")
    assert result is False


def test_get_status_returns_correct_status_from_job_queue_table():
    """Given a job in the queue, when get_status is called, it queries job_queue by id and returns the status."""
    mock_db = _mock_db_with_status("claimed")

    result = get_status(mock_db, "test-id")

    mock_db.table.assert_called_once_with("job_queue")
    mock_db.table.return_value.select.assert_called_once_with("status")
    mock_db.table.return_value.select.return_value.eq.assert_called_once_with("id", "test-id")
    assert result == JobStatus.CLAIMED
