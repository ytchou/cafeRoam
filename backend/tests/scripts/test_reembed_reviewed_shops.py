from unittest.mock import AsyncMock, MagicMock

from scripts.reembed_reviewed_shops import main


class TestReembedReviewedShopsScript:
    async def test_enqueues_jobs_for_shops_with_checkin_text(self):
        """Script enqueues GENERATE_EMBEDDING for all live shops with qualifying check-in text."""
        db = MagicMock()
        queue = AsyncMock()

        # Mock: find shops with qualifying check-in text
        db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "shop-001", "name": "山小孩咖啡"},
                {"id": "shop-002", "name": "虎記商行"},
            ]
        )
        # Mock: no pending jobs
        db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await main(dry_run=False, db=db, queue=queue)

        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 2

    async def test_dry_run_does_not_enqueue(self):
        """In dry-run mode, shops are listed but no jobs are enqueued."""
        db = MagicMock()
        queue = AsyncMock()

        db.rpc.return_value.execute.return_value = MagicMock(
            data=[{"id": "shop-001", "name": "山小孩咖啡"}]
        )

        await main(dry_run=True, db=db, queue=queue)

        queue.enqueue_batch.assert_not_called()

    async def test_deduplicates_against_pending_jobs(self):
        """Shops that already have a pending GENERATE_EMBEDDING job are skipped."""
        db = MagicMock()
        queue = AsyncMock()

        db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "shop-001", "name": "山小孩咖啡"},
                {"id": "shop-002", "name": "虎記商行"},
            ]
        )
        # shop-001 already has a pending job
        db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"payload": {"shop_id": "shop-001"}}]
        )

        await main(dry_run=False, db=db, queue=queue)

        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 1
        assert payloads[0]["shop_id"] == "shop-002"
