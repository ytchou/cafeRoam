from __future__ import annotations
import uuid
from typing import Any

from workers.queue import get_status, JobStatus


def check_job_still_claimed(db: Any, job_id: str | uuid.UUID) -> bool:
    """Return True iff the job's current status is 'claimed'."""
    status = get_status(db, job_id)
    return status == JobStatus.CLAIMED
