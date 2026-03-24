from unittest.mock import AsyncMock, MagicMock

from workers.handlers.reembed_reviewed_shops import handle_reembed_reviewed_shops


class TestReembedReviewedShops:
    async def test_enqueues_embedding_jobs_for_shops_with_new_checkins(self):
        """Given shops with check-ins newer than their last embedding, re-embed jobs are enqueued."""
        db = MagicMock()
        queue = AsyncMock()

        # RPC returns shops needing re-embedding
        db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "shop-001"},
                {"id": "shop-002"},
            ]
        )

        await handle_reembed_reviewed_shops(db=db, queue=queue)

        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 2
        assert payloads[0] == {"shop_id": "shop-001"}
        assert payloads[1] == {"shop_id": "shop-002"}

    async def test_skips_when_no_shops_need_reembedding(self):
        """When no shops have new check-in text, no jobs are enqueued."""
        db = MagicMock()
        queue = AsyncMock()

        db.rpc.return_value.execute.return_value = MagicMock(data=[])

        await handle_reembed_reviewed_shops(db=db, queue=queue)

        queue.enqueue_batch.assert_not_called()

    async def test_calls_rpc_with_correct_min_length(self):
        """The RPC is called with the minimum text length filter (15 chars)."""
        db = MagicMock()
        queue = AsyncMock()
        db.rpc.return_value.execute.return_value = MagicMock(data=[])

        await handle_reembed_reviewed_shops(db=db, queue=queue)

        db.rpc.assert_called_once()
        rpc_name, rpc_params = db.rpc.call_args[0]
        assert rpc_name == "find_shops_needing_review_reembed"
        assert rpc_params["p_min_text_length"] == 15
