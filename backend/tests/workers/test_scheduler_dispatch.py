"""Tests for scheduler job dispatch routing."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import Job, JobStatus, JobType
from workers.scheduler import _dispatch_job


def _make_job(job_type: JobType, payload: dict) -> Job:
    return Job(
        id="j-1",
        job_type=job_type,
        payload=payload,
        status=JobStatus.CLAIMED,
        attempts=1,
        scheduled_at=datetime(2026, 1, 1, tzinfo=UTC),
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.mark.asyncio
async def test_dispatch_routes_scrape_shop_to_handler():
    """When a SCRAPE_SHOP job is dispatched, the scrape_shop handler is called."""
    job = _make_job(
        JobType.SCRAPE_SHOP,
        {"shop_id": "s-1", "google_maps_url": "https://maps.google.com/?cid=123"},
    )

    with (
        patch("workers.scheduler.get_scraper_provider") as mock_get_scraper,
        patch("workers.scheduler.handle_scrape_shop", new_callable=AsyncMock) as mock_handler,
    ):
        mock_get_scraper.return_value = MagicMock()
        await _dispatch_job(job, MagicMock(), MagicMock())
        mock_handler.assert_called_once()


@pytest.mark.asyncio
async def test_dispatch_routes_publish_shop_to_handler():
    """When a PUBLISH_SHOP job is dispatched, the publish_shop handler is called."""
    job = _make_job(JobType.PUBLISH_SHOP, {"shop_id": "s-1"})

    with patch("workers.scheduler.handle_publish_shop", new_callable=AsyncMock) as mock_handler:
        await _dispatch_job(job, MagicMock(), MagicMock())
        mock_handler.assert_called_once()


@pytest.mark.asyncio
async def test_dispatch_classify_shop_photos():
    """CLASSIFY_SHOP_PHOTOS jobs are dispatched to the classification handler."""
    job = _make_job(JobType.CLASSIFY_SHOP_PHOTOS, {"shop_id": "shop-01"})

    with (
        patch("workers.scheduler.get_llm_provider") as mock_get_llm,
        patch(
            "workers.scheduler.handle_classify_shop_photos", new_callable=AsyncMock
        ) as mock_handler,
    ):
        mock_get_llm.return_value = MagicMock()
        await _dispatch_job(job, MagicMock(), MagicMock())

    mock_handler.assert_called_once()
    assert mock_handler.call_args.kwargs["payload"]["shop_id"] == "shop-01"
