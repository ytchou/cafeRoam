import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.backfill_community_summaries import main


def _make_db(
    shops_data: list,
    pending_jobs: list | None = None,
) -> MagicMock:
    """Build a db mock for backfill script testing."""
    db = MagicMock()

    shops_table = MagicMock()
    shops_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=shops_data
    )

    jobs_table = MagicMock()
    jobs_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=pending_jobs or []
    )

    table_mocks: dict[str, MagicMock] = {"shops": shops_table, "job_queue": jobs_table}
    db.table.side_effect = lambda name: table_mocks.get(name, MagicMock())
    db._table_mocks = table_mocks

    return db


class TestBackfillCommunitySummaries:
    async def test_enqueues_summarize_reviews_for_live_shops(self):
        """Running the script enqueues SUMMARIZE_REVIEWS for all live shops."""
        db = _make_db(
            shops_data=[
                {"id": "shop-taipei-01", "name": "虎記商行"},
                {"id": "shop-taipei-02", "name": "木子鳥"},
            ]
        )
        queue = AsyncMock()

        with patch("scripts.backfill_community_summaries.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue_batch.assert_called_once()
        call_kwargs = queue.enqueue_batch.call_args.kwargs
        assert call_kwargs["job_type"].value == "summarize_reviews"
        payloads = call_kwargs["payloads"]
        assert len(payloads) == 2

    async def test_skips_shops_with_existing_pending_jobs(self):
        """Script does not enqueue duplicate jobs when a SUMMARIZE_REVIEWS job is already pending."""
        db = _make_db(
            shops_data=[
                {"id": "shop-taipei-01", "name": "虎記商行"},
                {"id": "shop-taipei-02", "name": "木子鳥"},
            ],
            pending_jobs=[{"payload": {"shop_id": "shop-taipei-01"}}],
        )
        queue = AsyncMock()

        with patch("scripts.backfill_community_summaries.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 1
        assert payloads[0]["shop_id"] == "shop-taipei-02"

    async def test_dry_run_enqueues_no_jobs(self):
        """Dry-run mode lists shops without enqueueing any jobs."""
        db = _make_db(shops_data=[{"id": "shop-taipei-01", "name": "虎記商行"}])
        queue = AsyncMock()

        with patch("scripts.backfill_community_summaries.get_service_role_client", return_value=db):
            await main(dry_run=True, queue=queue)

        queue.enqueue_batch.assert_not_called()

    async def test_no_live_shops_exits_cleanly(self):
        """When no live shops exist, the script completes without error."""
        db = _make_db(shops_data=[])
        queue = AsyncMock()

        with patch("scripts.backfill_community_summaries.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue_batch.assert_not_called()
