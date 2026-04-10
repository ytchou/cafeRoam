import pytest
from unittest.mock import MagicMock, AsyncMock

from models.types import ReviewSummaryResult, ReviewTopic


class TestSummarizeReviewsHandler:
    def _make_db(
        self,
        google_review_rows: list[dict] | None = None,
        checkin_texts: list[dict] | None = None,
    ) -> MagicMock:
        """Build a db mock with shop_reviews table and get_ranked_checkin_texts RPC."""
        db = MagicMock()

        # shop_reviews table query
        shop_reviews_table = MagicMock()
        shop_reviews_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=google_review_rows if google_review_rows is not None else []
        )

        # shops table update
        shops_table = MagicMock()
        shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        db.table.side_effect = lambda name: shop_reviews_table if name == "shop_reviews" else shops_table
        db._shops_table = shops_table

        # RPC: get_ranked_checkin_texts
        db.rpc.return_value.execute.return_value = MagicMock(
            data=checkin_texts if checkin_texts is not None else []
        )

        return db

    async def test_handler_reads_shop_reviews_and_checkin_texts(self):
        """Handler passes both google_reviews and checkin_texts to LLM."""
        db = self._make_db(
            google_review_rows=[
                {"text": "Great pour-over"},
                {"text": "Slow service"},
            ],
            checkin_texts=[{"text": "很安靜"}],
        )
        llm = AsyncMock()
        llm.summarize_reviews.return_value = ReviewSummaryResult(
            summary_zh_tw="咖啡很棒",
            review_topics=[ReviewTopic(topic="手沖", count=5)],
        )
        queue = AsyncMock()
        queue.get_status.return_value = "claimed"

        from workers.handlers.summarize_reviews import handle_summarize_reviews
        await handle_summarize_reviews({"shop_id": "shop-1"}, db, llm, queue, "job-1")

        llm.summarize_reviews.assert_called_once_with(
            google_reviews=["Great pour-over", "Slow service"],
            checkin_texts=["很安靜"],
        )

    async def test_handler_persists_review_topics(self):
        """Handler writes review_topics JSONB and community_summary to shops."""
        db = self._make_db(
            google_review_rows=[{"text": "Good coffee"}],
            checkin_texts=[],
        )
        llm = AsyncMock()
        llm.summarize_reviews.return_value = ReviewSummaryResult(
            summary_zh_tw="咖啡品質高",
            review_topics=[ReviewTopic(topic="手沖", count=4), ReviewTopic(topic="安靜", count=2)],
        )
        queue = AsyncMock()
        queue.get_status.return_value = "claimed"

        from workers.handlers.summarize_reviews import handle_summarize_reviews
        await handle_summarize_reviews({"shop_id": "shop-1"}, db, llm, queue, "job-1")

        update_payload = db._shops_table.update.call_args[0][0]
        assert update_payload["community_summary"] == "咖啡品質高"
        assert update_payload["review_topics"] == [
            {"topic": "手沖", "count": 4},
            {"topic": "安靜", "count": 2},
        ]
        assert "community_summary_updated_at" in update_payload

    async def test_handler_skips_llm_when_no_reviews_at_all(self):
        """With no Google reviews AND no check-in texts, skip LLM and enqueue embedding."""
        db = self._make_db(
            google_review_rows=[],
            checkin_texts=[],
        )
        llm = AsyncMock()
        queue = AsyncMock()

        from workers.handlers.summarize_reviews import handle_summarize_reviews
        await handle_summarize_reviews({"shop_id": "shop-1"}, db, llm, queue, "job-1")

        llm.summarize_reviews.assert_not_called()
        queue.enqueue.assert_called_once()
        assert queue.enqueue.call_args.kwargs["job_type"].value == "generate_embedding"

    async def test_handler_google_only_no_checkins(self):
        """With only Google reviews (no check-ins), still calls LLM and persists."""
        db = self._make_db(
            google_review_rows=[{"text": "Great espresso"}],
            checkin_texts=[],
        )
        llm = AsyncMock()
        llm.summarize_reviews.return_value = ReviewSummaryResult(
            summary_zh_tw="義式咖啡出色",
            review_topics=[ReviewTopic(topic="義式", count=3)],
        )
        queue = AsyncMock()
        queue.get_status.return_value = "claimed"

        from workers.handlers.summarize_reviews import handle_summarize_reviews
        await handle_summarize_reviews({"shop_id": "shop-1"}, db, llm, queue, "job-1")

        llm.summarize_reviews.assert_called_once_with(
            google_reviews=["Great espresso"],
            checkin_texts=[],
        )

    async def test_llm_failure_propagates_without_enqueuing_embedding(self):
        """When LLM fails, the exception propagates and no GENERATE_EMBEDDING is enqueued."""
        db = self._make_db(
            google_review_rows=[{"text": "好喝的咖啡，推薦拿鐵"}],
            checkin_texts=[],
        )
        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(side_effect=RuntimeError("LLM API error"))
        queue = AsyncMock()

        with pytest.raises(RuntimeError, match="LLM API error"):
            from workers.handlers.summarize_reviews import handle_summarize_reviews
            await handle_summarize_reviews({"shop_id": "shop-1"}, db, llm, queue, "job-1")

        queue.enqueue.assert_not_called()

    async def test_english_summary_is_rejected_with_error(self):
        """When LLM returns an English-dominant summary, the handler raises ValueError and does not write to DB."""
        db = self._make_db(
            google_review_rows=[{"text": "Nice latte, quiet space for working"}],
            checkin_texts=[],
        )
        llm = AsyncMock()
        llm.summarize_reviews.return_value = ReviewSummaryResult(
            summary_zh_tw="Customers recommend the latte. Quiet atmosphere.",
            review_topics=[],
        )
        queue = AsyncMock()
        queue.get_status.return_value = "claimed"

        with pytest.raises(ValueError):
            from workers.handlers.summarize_reviews import handle_summarize_reviews
            await handle_summarize_reviews({"shop_id": "shop-1"}, db, llm, queue, "job-1")

        db._shops_table.update.assert_not_called()
        queue.enqueue.assert_not_called()

    async def test_rpc_called_with_correct_parameters(self):
        """The handler calls get_ranked_checkin_texts with correct shop_id and min length."""
        db = self._make_db(
            google_review_rows=[],
            checkin_texts=[],
        )
        llm = AsyncMock()
        queue = AsyncMock()

        from workers.handlers.summarize_reviews import handle_summarize_reviews
        await handle_summarize_reviews(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            llm=llm,
            queue=queue,
            job_id="job-summary-rpc-06",
        )

        db.rpc.assert_called_once()
        rpc_name, rpc_params = db.rpc.call_args[0]
        assert rpc_name == "get_ranked_checkin_texts"
        assert rpc_params["p_shop_id"] == "shop-d4e5f6"
        assert rpc_params["p_min_length"] == 15
