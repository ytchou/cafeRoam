from unittest.mock import AsyncMock, MagicMock

from scripts.reembed_reviewed_shops import main


SHOP_ID_1 = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SHOP_ID_2 = "b2c3d4e5-f6a7-8901-bcde-f12345678901"


class TestReembedReviewedShopsScript:
    async def test_enqueues_jobs_for_shops_with_checkin_text(self):
        """Script enqueues GENERATE_EMBEDDING for all live shops with qualifying check-in text."""
        db = MagicMock()
        queue = AsyncMock()

        # Mock: find_shops_with_checkin_text RPC returns shops eligible for re-embedding
        db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"id": SHOP_ID_1, "name": "山小孩咖啡"},
                {"id": SHOP_ID_2, "name": "虎記商行"},
            ]
        )
        # Mock: no pending or in-progress jobs
        db.table.return_value.select.return_value.eq.return_value.in_.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await main(dry_run=False, db=db, queue=queue)

        db.rpc.assert_called_once_with(
            "find_shops_with_checkin_text", {"p_min_text_length": 15}
        )
        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 2

    async def test_dry_run_does_not_enqueue(self):
        """In dry-run mode, shops are listed but no jobs are enqueued."""
        db = MagicMock()
        queue = AsyncMock()

        db.rpc.return_value.execute.return_value = MagicMock(
            data=[{"id": SHOP_ID_1, "name": "山小孩咖啡"}]
        )

        await main(dry_run=True, db=db, queue=queue)

        queue.enqueue_batch.assert_not_called()

    async def test_deduplicates_against_pending_and_active_jobs(self):
        """Shops with a pending or in-progress GENERATE_EMBEDDING job are skipped to prevent concurrent embedding races."""
        db = MagicMock()
        queue = AsyncMock()

        db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"id": SHOP_ID_1, "name": "山小孩咖啡"},
                {"id": SHOP_ID_2, "name": "虎記商行"},
            ]
        )
        # SHOP_ID_1 already has a pending job
        db.table.return_value.select.return_value.eq.return_value.in_.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[{"payload": {"shop_id": SHOP_ID_1}}]
        )

        await main(dry_run=False, db=db, queue=queue)

        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 1
        assert payloads[0]["shop_id"] == SHOP_ID_2
