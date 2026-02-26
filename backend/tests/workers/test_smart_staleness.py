from unittest.mock import AsyncMock, MagicMock

import pytest

from workers.handlers.staleness_sweep import handle_smart_staleness_sweep


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.rpc.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "shop-1",
                "name": "Stale Cafe",
                "enriched_at": "2025-11-01T00:00:00Z",
                "last_checked_at": None,
                "google_place_id": "ChIJ_test",
            },
        ]
    )
    mock_reviews = db.table.return_value.select.return_value.eq.return_value.order.return_value
    mock_reviews.limit.return_value.execute.return_value = MagicMock(
        data=[{"published_at": "2025-12-01"}]
    )
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    return db


@pytest.fixture
def mock_scraper_with_new_reviews():
    scraper = AsyncMock()
    # Return reviews with a newer date than stored
    scraper.scrape_reviews_only.return_value = [
        {"text": "New review!", "stars": 5, "published_at": "2026-02-15"},
    ]
    return scraper


@pytest.fixture
def mock_scraper_no_new_reviews():
    scraper = AsyncMock()
    # Return reviews with same/older date
    scraper.scrape_reviews_only.return_value = [
        {"text": "Old review", "stars": 4, "published_at": "2025-11-01"},
    ]
    return scraper


@pytest.fixture
def mock_queue():
    queue = MagicMock()
    queue.enqueue = AsyncMock(return_value="job-1")
    return queue


@pytest.mark.asyncio
async def test_smart_sweep_queues_when_new_reviews(
    mock_db, mock_scraper_with_new_reviews, mock_queue
):
    await handle_smart_staleness_sweep(
        db=mock_db, scraper=mock_scraper_with_new_reviews, queue=mock_queue
    )
    # Should queue re-enrichment because new review found
    mock_queue.enqueue.assert_called_once()


@pytest.mark.asyncio
async def test_smart_sweep_skips_when_no_new_reviews(
    mock_db, mock_scraper_no_new_reviews, mock_queue
):
    await handle_smart_staleness_sweep(
        db=mock_db, scraper=mock_scraper_no_new_reviews, queue=mock_queue
    )
    # Should NOT queue re-enrichment
    mock_queue.enqueue.assert_not_called()
