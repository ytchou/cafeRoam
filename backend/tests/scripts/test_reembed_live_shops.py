import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.reembed_live_shops import main


def _make_db(shops_data: list, pending_jobs: list | None = None) -> MagicMock:
    """Build a db mock that returns different data for 'shops' vs 'job_queue' queries.

    Pre-creates and stores each table mock so tests can assert on them directly
    via db._table_mocks["shops"] — calling db.table(...) in a test assertion would
    invoke side_effect and return a fresh mock, not the one used by the script.
    """
    db = MagicMock()

    shops_table = MagicMock()
    shops_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=shops_data)

    jobs_table = MagicMock()
    jobs_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=pending_jobs or [])

    table_mocks: dict[str, MagicMock] = {"shops": shops_table, "job_queue": jobs_table}
    db.table.side_effect = lambda name: table_mocks.get(name, MagicMock())
    db._table_mocks = table_mocks
    return db


class TestReembedLiveShopsScript:
    async def test_enqueues_generate_embedding_for_every_live_shop(self):
        """Running the script enqueues one batch job covering all live shops."""
        db = _make_db(shops_data=[
            {"id": "shop-taipei-01", "name": "虎記商行"},
            {"id": "shop-taipei-02", "name": "木子鳥"},
        ])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        shop_ids = [p["shop_id"] for p in payloads]
        assert "shop-taipei-01" in shop_ids
        assert "shop-taipei-02" in shop_ids

    async def test_only_live_shops_are_targeted_by_db_query(self):
        """Script queries the DB with processing_status='live' — non-live shops are excluded at query time."""
        db = _make_db(shops_data=[{"id": "shop-taipei-01", "name": "虎記商行"}])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        # Verify the shops query filtered by processing_status='live'
        db._table_mocks["shops"].select.return_value.eq.assert_called_with("processing_status", "live")
        queue.enqueue_batch.assert_called_once()

    async def test_skips_shops_with_existing_pending_jobs(self):
        """Script does not enqueue duplicate jobs when a GENERATE_EMBEDDING job is already pending."""
        db = _make_db(
            shops_data=[
                {"id": "shop-taipei-01", "name": "虎記商行"},
                {"id": "shop-taipei-02", "name": "木子鳥"},
            ],
            pending_jobs=[{"payload": {"shop_id": "shop-taipei-01"}}],
        )
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 1
        assert payloads[0]["shop_id"] == "shop-taipei-02"

    async def test_dry_run_enqueues_no_jobs(self):
        """Dry-run mode lists shops without enqueueing any jobs."""
        db = _make_db(shops_data=[{"id": "shop-taipei-01", "name": "虎記商行"}])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=True, queue=queue)

        queue.enqueue_batch.assert_not_called()

    async def test_no_shops_exits_cleanly(self):
        """When no live shops exist, the script completes without error."""
        db = _make_db(shops_data=[])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue_batch.assert_not_called()
