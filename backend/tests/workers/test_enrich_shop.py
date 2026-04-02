from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import EnrichmentResult, ShopModeScores, TarotEnrichmentResult
from workers.handlers.enrich_shop import handle_enrich_shop


class TestEnrichShopLanguageGuard:
    """Validate that the enrichment handler rejects non-zh-TW summaries."""

    def _make_db(self) -> MagicMock:
        db = MagicMock()

        shop_data = {
            "id": "shop-abc123",
            "name": "森林咖啡",
            "description": None,
            "categories": ["cafe"],
            "price_range": "$$",
            "socket": "yes",
            "limited_time": "no",
            "rating": 4.5,
            "review_count": 120,
        }
        db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=shop_data
        )

        reviews_data = [
            {"text": "手沖咖啡很棒，環境安靜適合工作"},
            {"text": "巴斯克蛋糕必點，拿鐵也好喝"},
        ]
        review_mock = MagicMock()
        review_mock.execute.return_value = MagicMock(data=reviews_data)

        shops_table = MagicMock()
        shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=shop_data
        )
        shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        shop_tags_table = MagicMock()
        shop_tags_table.delete.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        shop_tags_table.insert.return_value.execute.return_value = MagicMock(data=[])

        shop_reviews_table = MagicMock()
        shop_reviews_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=reviews_data
        )

        def table_router(name: str) -> MagicMock:
            if name == "shops":
                return shops_table
            if name == "shop_tags":
                return shop_tags_table
            if name == "shop_reviews":
                return shop_reviews_table
            return MagicMock()

        db.table.side_effect = table_router
        db._shops_table = shops_table
        return db

    def _make_enrichment_result(self, summary: str) -> EnrichmentResult:
        return EnrichmentResult(
            tags=[],
            tag_confidences={},
            summary=summary,
            confidence=0.8,
            mode_scores=ShopModeScores(work=0.8, rest=0.2, social=0.1),
            menu_highlights=["拿鐵", "巴斯克蛋糕"],
            coffee_origins=["耶加雪菲"],
        )

    async def test_zh_tw_summary_is_accepted_and_written_to_db(self):
        """Given an LLM that returns a zh-TW summary, the handler writes it to the DB."""
        db = self._make_db()
        llm = AsyncMock()
        llm.enrich_shop = AsyncMock(
            return_value=self._make_enrichment_result(
                "隱身巷弄的老屋咖啡廳，以手沖單品和巴斯克蛋糕聞名。適合安靜工作的自由工作者。"
            )
        )
        llm.assign_tarot = AsyncMock(
            return_value=TarotEnrichmentResult(tarot_title=None, flavor_text="")
        )
        queue = AsyncMock()

        await handle_enrich_shop(
            payload={"shop_id": "shop-abc123"},
            db=db,
            llm=llm,
            queue=queue,
        )

        update_data = db._shops_table.update.call_args[0][0]
        assert "隱身巷弄" in update_data["description"]
        queue.enqueue.assert_called_once()

    async def test_english_summary_is_rejected_with_error(self):
        """Given an LLM that returns an English summary, the handler raises ValueError."""
        db = self._make_db()
        llm = AsyncMock()
        llm.enrich_shop = AsyncMock(
            return_value=self._make_enrichment_result(
                "A hidden gem in the alley, known for pour-over coffee and Basque cheesecake. "
                "Perfect for freelancers who need a quiet workspace."
            )
        )
        queue = AsyncMock()

        with pytest.raises(ValueError, match="not in Traditional Chinese"):
            await handle_enrich_shop(
                payload={"shop_id": "shop-abc123"},
                db=db,
                llm=llm,
                queue=queue,
            )

        db._shops_table.update.assert_not_called()
        queue.enqueue.assert_not_called()
