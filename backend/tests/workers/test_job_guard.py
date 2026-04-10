from unittest.mock import MagicMock, patch

from models.types import JobStatus
from workers.job_guard import check_job_still_claimed
from workers.queue import get_status


def test_check_job_still_claimed_returns_true_when_claimed():
    """check_job_still_claimed returns True when the job status is claimed."""
    with patch("workers.job_guard.get_status", return_value=JobStatus.CLAIMED):
        mock_db = MagicMock()
        result = check_job_still_claimed(mock_db, "job-id-1")
    assert result is True


def test_check_job_still_claimed_returns_false_when_cancelled():
    """check_job_still_claimed returns False when the job status is cancelled."""
    with patch("workers.job_guard.get_status", return_value=JobStatus.CANCELLED):
        mock_db = MagicMock()
        result = check_job_still_claimed(mock_db, "job-id-2")
    assert result is False


def test_check_job_still_claimed_returns_false_when_dead_letter():
    """check_job_still_claimed returns False when the job status is dead_letter."""
    with patch("workers.job_guard.get_status", return_value=JobStatus.DEAD_LETTER):
        mock_db = MagicMock()
        result = check_job_still_claimed(mock_db, "job-id-3")
    assert result is False


def test_check_job_still_claimed_returns_false_when_none():
    """check_job_still_claimed returns False when the job is not found."""
    with patch("workers.job_guard.get_status", return_value=None):
        mock_db = MagicMock()
        result = check_job_still_claimed(mock_db, "job-id-missing")
    assert result is False


def test_queue_get_status_queries_correct_table():
    """get_status queries job_queue.status by job_id and returns the correct JobStatus."""
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[{"status": "claimed"}])
    )

    result = get_status(mock_db, "test-id")

    mock_db.table.assert_called_once_with("job_queue")
    mock_db.table.return_value.select.assert_called_once_with("status")
    mock_db.table.return_value.select.return_value.eq.assert_called_once_with("id", "test-id")
    assert result == JobStatus.CLAIMED
