from unittest.mock import AsyncMock, MagicMock

from workers.handlers.reembed_reviewed_shops import handle_reembed_reviewed_shops


class TestReembedReviewedShops:
    async def test_enqueues_embedding_jobs_for_shops_with_new_checkins(self):
        """Given shops with check-ins newer than their last embedding, re-embed jobs are enqueued."""
        db = MagicMock()
        queue = AsyncMock()

        shop_id_1 = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        shop_id_2 = "b2c3d4e5-f6a7-8901-bcde-f12345678901"

        # RPC returns shops needing re-embedding
        db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"id": shop_id_1},
                {"id": shop_id_2},
            ]
        )

        await handle_reembed_reviewed_shops(db=db, queue=queue)

        queue.enqueue_batch.assert_called_once()
        payloads = queue.enqueue_batch.call_args.kwargs["payloads"]
        assert len(payloads) == 2
        assert payloads[0] == {"shop_id": shop_id_1}
        assert payloads[1] == {"shop_id": shop_id_2}

    async def test_skips_when_no_shops_need_reembedding(self):
        """When no shops have new check-in text, no jobs are enqueued."""
        db = MagicMock()
        queue = AsyncMock()

        db.rpc.return_value.execute.return_value = MagicMock(data=[])

        await handle_reembed_reviewed_shops(db=db, queue=queue)

        queue.enqueue_batch.assert_not_called()

    async def test_check_ins_under_minimum_length_do_not_trigger_reembed(self):
        """Short check-in texts (under 15 chars) are excluded so noise does not cause unnecessary re-embeds."""
        db = MagicMock()
        queue = AsyncMock()
        db.rpc.return_value.execute.return_value = MagicMock(data=[])

        await handle_reembed_reviewed_shops(db=db, queue=queue)

        db.rpc.assert_called_once()
        rpc_name, rpc_params = db.rpc.call_args[0]
        assert rpc_name == "find_shops_needing_review_reembed"
        assert rpc_params["p_min_text_length"] == 15
