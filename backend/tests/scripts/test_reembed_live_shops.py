import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, call, patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.reembed_live_shops import main


def _make_db(shops_data: list, pending_jobs: list | None = None) -> MagicMock:
    """Build a db mock that returns different data for 'shops' vs 'job_queue' queries."""
    db = MagicMock()

    shops_result = MagicMock(data=shops_data)
    jobs_result = MagicMock(data=pending_jobs or [])

    def table_side_effect(table_name: str) -> MagicMock:
        mock = MagicMock()
        if table_name == "shops":
            mock.select.return_value.eq.return_value.execute.return_value = shops_result
        elif table_name == "job_queue":
            mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = jobs_result
        return mock

    db.table.side_effect = table_side_effect
    return db


class TestReembedLiveShopsScript:
    async def test_enqueues_generate_embedding_for_every_live_shop(self):
        """Running the script enqueues one GENERATE_EMBEDDING job per live shop."""
        db = _make_db(shops_data=[
            {"id": "shop-taipei-01", "name": "虎記商行"},
            {"id": "shop-taipei-02", "name": "木子鳥"},
        ])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        assert queue.enqueue.call_count == 2
        call_payloads = [c.kwargs["payload"]["shop_id"] for c in queue.enqueue.call_args_list]
        assert "shop-taipei-01" in call_payloads
        assert "shop-taipei-02" in call_payloads

    async def test_only_live_shops_are_targeted_by_db_query(self):
        """Script queries the DB with processing_status='live' — non-live shops are excluded at query time."""
        db = _make_db(shops_data=[{"id": "shop-taipei-01", "name": "虎記商行"}])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        # Verify the shops query filtered by processing_status='live'
        db.table("shops").select.return_value.eq.assert_called_with("processing_status", "live")
        assert queue.enqueue.call_count == 1

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

        assert queue.enqueue.call_count == 1
        assert queue.enqueue.call_args.kwargs["payload"]["shop_id"] == "shop-taipei-02"

    async def test_dry_run_enqueues_no_jobs(self):
        """Dry-run mode lists shops without enqueueing any jobs."""
        db = _make_db(shops_data=[{"id": "shop-taipei-01", "name": "虎記商行"}])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=True, queue=queue)

        queue.enqueue.assert_not_called()

    async def test_no_shops_exits_cleanly(self):
        """When no live shops exist, the script completes without error."""
        db = _make_db(shops_data=[])
        queue = AsyncMock()

        with patch("scripts.reembed_live_shops.get_service_role_client", return_value=db):
            await main(dry_run=False, queue=queue)

        queue.enqueue.assert_not_called()
