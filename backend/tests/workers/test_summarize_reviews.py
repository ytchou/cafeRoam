from unittest.mock import AsyncMock, MagicMock

from workers.handlers.summarize_reviews import handle_summarize_reviews


class TestSummarizeReviewsHandler:
    def _make_db(
        self,
        checkin_texts: list[dict] | None = None,
    ) -> MagicMock:
        """Build a db mock that returns check-in texts from RPC and allows shops table updates."""
        db = MagicMock()

        # RPC: get_ranked_checkin_texts
        db.rpc.return_value.execute.return_value = MagicMock(
            data=checkin_texts if checkin_texts is not None else []
        )

        # shops table update
        shops_table = MagicMock()
        shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        db.table.side_effect = lambda name: shops_table if name == "shops" else MagicMock()
        db._shops_table = shops_table
        return db

    async def test_happy_path_generates_summary_and_enqueues_embedding(self):
        """Given a shop with qualifying reviews, Claude is called and summary is stored, then GENERATE_EMBEDDING is enqueued."""
        db = self._make_db(
            checkin_texts=[
                {"text": "超好喝的拿鐵，環境安靜適合工作"},
                {"text": "巴斯克蛋糕是必點的，每次來都會點"},
            ]
        )
        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(
            return_value="顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。"
        )
        queue = AsyncMock()

        await handle_summarize_reviews(
            payload={"shop_id": "shop-a1b2c3"},
            db=db,
            llm=llm,
            queue=queue,
        )

        # Claude was called with the review texts
        llm.summarize_reviews.assert_called_once_with(
            ["超好喝的拿鐵，環境安靜適合工作", "巴斯克蛋糕是必點的，每次來都會點"]
        )

        # Summary stored in DB
        update_data = db._shops_table.update.call_args[0][0]
        assert update_data["community_summary"] == "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。"
        assert "community_summary_updated_at" in update_data

        # GENERATE_EMBEDDING enqueued
        queue.enqueue.assert_called_once()
        assert queue.enqueue.call_args.kwargs["job_type"].value == "generate_embedding"
        assert queue.enqueue.call_args.kwargs["payload"] == {"shop_id": "shop-a1b2c3"}

    async def test_no_qualifying_texts_skips_claude_and_enqueues_embedding_directly(self):
        """When no check-in texts qualify, skip Claude call and directly enqueue GENERATE_EMBEDDING."""
        db = self._make_db(checkin_texts=[])
        llm = AsyncMock()
        queue = AsyncMock()

        await handle_summarize_reviews(
            payload={"shop_id": "shop-a1b2c3"},
            db=db,
            llm=llm,
            queue=queue,
        )

        # Claude NOT called
        llm.summarize_reviews.assert_not_called()

        # No DB update
        db._shops_table.update.assert_not_called()

        # GENERATE_EMBEDDING still enqueued (for fallback to raw concat)
        queue.enqueue.assert_called_once()
        assert queue.enqueue.call_args.kwargs["job_type"].value == "generate_embedding"

    async def test_llm_failure_propagates_without_enqueuing_embedding(self):
        """When Claude fails, the exception propagates and no GENERATE_EMBEDDING is enqueued."""
        db = self._make_db(checkin_texts=[{"text": "好喝的咖啡，推薦拿鐵"}])
        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(side_effect=RuntimeError("Claude API error"))
        queue = AsyncMock()

        import pytest

        with pytest.raises(RuntimeError, match="Claude API error"):
            await handle_summarize_reviews(
                payload={"shop_id": "shop-a1b2c3"},
                db=db,
                llm=llm,
                queue=queue,
            )

        # No embedding enqueued on failure
        queue.enqueue.assert_not_called()

    async def test_filters_out_empty_and_none_texts_before_calling_claude(self):
        """When RPC returns rows with None or empty text values, only qualifying texts are passed to Claude."""
        db = self._make_db(
            checkin_texts=[
                {"text": "有料咖啡，環境好"},
                {"text": None},
                {"text": ""},
                {"text": "巴斯克蛋糕必點"},
            ]
        )
        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(return_value="顧客推薦咖啡和甜點。")
        queue = AsyncMock()

        await handle_summarize_reviews(
            payload={"shop_id": "shop-a1b2c3"},
            db=db,
            llm=llm,
            queue=queue,
        )

        # Only the two non-empty texts are passed to Claude
        llm.summarize_reviews.assert_called_once_with(["有料咖啡，環境好", "巴斯克蛋糕必點"])

    async def test_english_summary_is_rejected_with_error(self):
        """When Claude returns an English-dominant summary, the handler raises ValueError and does not write to DB."""
        db = self._make_db(
            checkin_texts=[
                {"text": "Nice latte, quiet space for working"},
                {"text": "Great cheesecake, friendly staff"},
            ]
        )
        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(
            return_value="Customers recommend the latte and cheesecake. Quiet atmosphere suitable for work."
        )
        queue = AsyncMock()

        import pytest

        with pytest.raises(ValueError, match="not in Traditional Chinese"):
            await handle_summarize_reviews(
                payload={"shop_id": "shop-a1b2c3"},
                db=db,
                llm=llm,
                queue=queue,
            )

        db._shops_table.update.assert_not_called()
        queue.enqueue.assert_not_called()

    async def test_rpc_called_with_correct_parameters(self):
        """The handler calls get_ranked_checkin_texts with the correct shop_id and min length."""
        db = self._make_db(checkin_texts=[])
        llm = AsyncMock()
        queue = AsyncMock()

        await handle_summarize_reviews(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            llm=llm,
            queue=queue,
        )

        db.rpc.assert_called_once()
        rpc_name, rpc_params = db.rpc.call_args[0]
        assert rpc_name == "get_ranked_checkin_texts"
        assert rpc_params["p_shop_id"] == "shop-d4e5f6"
        assert rpc_params["p_min_length"] == 15
        assert rpc_params["p_limit"] == 20
