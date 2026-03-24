import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.reembed_live_shops import main


class TestReembedLiveShopsScript:
    async def test_enqueues_generate_embedding_for_every_live_shop(self):
        """Running the script enqueues one GENERATE_EMBEDDING job per live shop."""
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "shop-taipei-01", "name": "虎記商行"},
                {"id": "shop-taipei-02", "name": "木子鳥"},
            ]
        )

        queue = AsyncMock()

        with (
            patch("scripts.reembed_live_shops.get_service_role_client", return_value=db),
            patch("scripts.reembed_live_shops.JobQueue", return_value=queue),
        ):
            await main(dry_run=False)

        assert queue.enqueue.call_count == 2
        call_payloads = [c.kwargs["payload"]["shop_id"] for c in queue.enqueue.call_args_list]
        assert "shop-taipei-01" in call_payloads
        assert "shop-taipei-02" in call_payloads

    async def test_dry_run_enqueues_no_jobs(self):
        """Dry-run mode lists shops without enqueueing any jobs."""
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "shop-taipei-01", "name": "虎記商行"}]
        )

        queue = AsyncMock()

        with (
            patch("scripts.reembed_live_shops.get_service_role_client", return_value=db),
            patch("scripts.reembed_live_shops.JobQueue", return_value=queue),
        ):
            await main(dry_run=True)

        queue.enqueue.assert_not_called()

    async def test_no_shops_exits_cleanly(self):
        """When no live shops exist, the script completes without error."""
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        queue = AsyncMock()

        with (
            patch("scripts.reembed_live_shops.get_service_role_client", return_value=db),
            patch("scripts.reembed_live_shops.JobQueue", return_value=queue),
        ):
            await main(dry_run=False)

        queue.enqueue.assert_not_called()
