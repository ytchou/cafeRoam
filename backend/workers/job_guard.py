from __future__ import annotations

from typing import TYPE_CHECKING, Any

from models.types import JobStatus
from workers.queue import get_status

if TYPE_CHECKING:
    import uuid


def check_job_still_claimed(db: Any, job_id: str | uuid.UUID) -> bool:
    """Return True iff the job's current status is 'claimed'."""
    status = get_status(db, job_id)
    return status == JobStatus.CLAIMED
