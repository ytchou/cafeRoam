"""Tests for the daily batch scrape cron."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import JobType


@pytest.mark.asyncio
async def test_daily_batch_scrape_enqueues_pending_shops():
    """Given 3 pending shops with URLs, enqueues a single SCRAPE_BATCH job."""
    mock_db = MagicMock()
    mock_shops = [
        {"id": "shop-1", "google_maps_url": "https://maps.google.com/?cid=1"},
        {"id": "shop-2", "google_maps_url": "https://maps.google.com/?cid=2"},
        {"id": "shop-3", "google_maps_url": "https://maps.google.com/?cid=3"},
    ]
    mock_subs = [
        {"shop_id": "shop-1", "id": "sub-1", "submitted_by": "user-1"},
    ]

    shops_response = MagicMock()
    shops_response.data = mock_shops
    mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.execute.return_value = shops_response

    subs_response = MagicMock()
    subs_response.data = mock_subs
    mock_db.table.return_value.select.return_value.in_.return_value.eq.return_value.execute.return_value = subs_response

    mock_queue = AsyncMock()

    with (
        patch("workers.scheduler.get_service_role_client", return_value=mock_db),
        patch("workers.scheduler.JobQueue", return_value=mock_queue),
    ):
        from workers.scheduler import run_daily_batch_scrape

        await run_daily_batch_scrape.__wrapped__()

    mock_queue.enqueue.assert_called_once()
    call_args = mock_queue.enqueue.call_args
    assert call_args.kwargs["job_type"] == JobType.SCRAPE_BATCH
    payload = call_args.kwargs["payload"]
    assert len(payload["shops"]) == 3
    assert "batch_id" in payload
    shop1 = next(s for s in payload["shops"] if s["shop_id"] == "shop-1")
    assert shop1["submission_id"] == "sub-1"
    assert shop1["submitted_by"] == "user-1"
    shop2 = next(s for s in payload["shops"] if s["shop_id"] == "shop-2")
    assert "submission_id" not in shop2


@pytest.mark.asyncio
async def test_daily_batch_scrape_skips_when_no_pending_shops():
    """Given no pending shops, does not enqueue any job."""
    mock_db = MagicMock()
    shops_response = MagicMock()
    shops_response.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.execute.return_value = shops_response

    mock_queue = AsyncMock()

    with (
        patch("workers.scheduler.get_service_role_client", return_value=mock_db),
        patch("workers.scheduler.JobQueue", return_value=mock_queue),
    ):
        from workers.scheduler import run_daily_batch_scrape

        await run_daily_batch_scrape.__wrapped__()

    mock_queue.enqueue.assert_not_called()
