from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import Job, JobStatus, JobType
from workers.scheduler import process_job_queue


@pytest.mark.asyncio
async def test_process_job_queue_dispatches_scrape_shop():
    job = Job(
        id="j-1",
        job_type=JobType.SCRAPE_SHOP,
        payload={"shop_id": "s-1", "google_maps_url": "https://maps.google.com/?cid=123"},
        status=JobStatus.CLAIMED,
        attempts=1,
        scheduled_at="2026-01-01T00:00:00Z",
        created_at="2026-01-01T00:00:00Z",
    )

    with (
        patch("workers.scheduler.get_service_role_client") as mock_get_db,
        patch("workers.scheduler.JobQueue") as mock_queue_cls,
        patch("workers.scheduler.get_scraper_provider") as mock_get_scraper,
        patch("workers.scheduler.handle_scrape_shop", new_callable=AsyncMock) as mock_handler,
    ):
        mock_queue = MagicMock()
        mock_queue.claim = AsyncMock(return_value=job)
        mock_queue.complete = AsyncMock()
        mock_queue_cls.return_value = mock_queue
        mock_get_db.return_value = MagicMock()
        mock_get_scraper.return_value = MagicMock()

        await process_job_queue()

        mock_handler.assert_called_once()


@pytest.mark.asyncio
async def test_process_job_queue_dispatches_publish_shop():
    job = Job(
        id="j-2",
        job_type=JobType.PUBLISH_SHOP,
        payload={"shop_id": "s-1"},
        status=JobStatus.CLAIMED,
        attempts=1,
        scheduled_at="2026-01-01T00:00:00Z",
        created_at="2026-01-01T00:00:00Z",
    )

    with (
        patch("workers.scheduler.get_service_role_client") as mock_get_db,
        patch("workers.scheduler.JobQueue") as mock_queue_cls,
        patch("workers.scheduler.handle_publish_shop", new_callable=AsyncMock) as mock_handler,
    ):
        mock_queue = MagicMock()
        mock_queue.claim = AsyncMock(return_value=job)
        mock_queue.complete = AsyncMock()
        mock_queue_cls.return_value = mock_queue
        mock_get_db.return_value = MagicMock()

        await process_job_queue()

        mock_handler.assert_called_once()
