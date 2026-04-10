from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import (
    EnrichmentResult,
    JobStatus,
    ReviewSummaryResult,
    ReviewTopic,
    ShopModeScores,
)
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.summarize_reviews import handle_summarize_reviews
from workers.job_guard import check_job_still_claimed


@pytest.mark.asyncio
async def test_check_job_still_claimed_returns_true_for_claimed_job():
    """System keeps the in-flight worker active when the queue row is still claimed."""
    queue = AsyncMock()
    queue.get_status.return_value = "claimed"

    assert await check_job_still_claimed(queue, "job-cafe-claimed-01") is True


@pytest.mark.asyncio
async def test_check_job_still_claimed_returns_true_for_claimed_job_status_enum():
    """System accepts queue implementations that return the JobStatus enum directly."""
    queue = AsyncMock()
    queue.get_status.return_value = JobStatus.CLAIMED

    assert await check_job_still_claimed(queue, "job-cafe-claimed-enum-02") is True


@pytest.mark.parametrize("status", ["failed", "cancelled", "dead_letter"])
@pytest.mark.asyncio
async def test_check_job_still_claimed_returns_false_for_non_claimed_jobs(status: str):
    """System blocks the write path after the job leaves the claimed state."""
    queue = AsyncMock()
    queue.get_status.return_value = status

    assert await check_job_still_claimed(queue, f"job-cafe-{status}-03") is False


@pytest.mark.asyncio
async def test_check_job_still_claimed_returns_false_when_job_is_missing():
    """System blocks the write path when the queue row can no longer be found."""
    queue = AsyncMock()
    queue.get_status.return_value = None

    assert await check_job_still_claimed(queue, "job-cafe-missing-04") is False


def _make_enrich_db() -> MagicMock:
    db = MagicMock()
    shop_data = {
        "id": "shop-guard-enrich-01",
        "name": "霧丘咖啡",
        "description": "木質空間，適合久坐。",
        "categories": ["cafe"],
        "price_range": "$$",
        "socket": "yes",
        "limited_time": "no",
        "rating": 4.7,
        "review_count": 218,
        "google_maps_features": {},
    }

    shops_table = MagicMock()
    shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
        MagicMock(data=shop_data)
    )
    shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    shop_reviews_table = MagicMock()
    shop_reviews_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"text": "安靜、插座多、手沖表現穩定。"}]
    )

    shop_photos_table = MagicMock()
    (
        shop_photos_table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value
    ) = MagicMock(data=[])

    shop_tags_table = MagicMock()
    shop_tags_table.delete.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    shop_tags_table.insert.return_value.execute.return_value = MagicMock(data=[])

    def table_router(name: str) -> MagicMock:
        if name == "shops":
            return shops_table
        if name == "shop_reviews":
            return shop_reviews_table
        if name == "shop_photos":
            return shop_photos_table
        if name == "shop_tags":
            return shop_tags_table
        return MagicMock()

    db.table.side_effect = table_router
    db._shops_table = shops_table
    return db


@pytest.mark.asyncio
async def test_handle_enrich_shop_skips_writes_when_job_was_force_failed():
    """Admin force-fail prevents enrichment from overwriting shop fields mid-flight."""
    db = _make_enrich_db()
    llm = AsyncMock()
    llm.enrich_shop.return_value = EnrichmentResult(
        tags=[],
        tag_confidences={},
        summary="巷口咖啡館以穩定手沖和安靜工作氛圍受到常客喜愛。",
        confidence=0.93,
        mode_scores=ShopModeScores(work=0.86, rest=0.41, social=0.22),
        menu_highlights=["手沖單品"],
        coffee_origins=["衣索比亞"],
    )
    llm.assign_tarot.return_value = MagicMock(tarot_title=None, flavor_text="")
    queue = AsyncMock()
    queue.get_status.return_value = "failed"

    await handle_enrich_shop(
        payload={"shop_id": "shop-guard-enrich-01"},
        db=db,
        llm=llm,
        queue=queue,
        job_id="job-guard-enrich-01",
    )

    db._shops_table.update.assert_not_called()
    queue.enqueue.assert_not_called()


def _make_embedding_db() -> MagicMock:
    db = MagicMock()
    shop_data = {
        "name": "夜航咖啡研究所",
        "description": "深焙義式和甜點組合穩定。",
        "processing_status": "embedding",
        "community_summary": None,
    }

    shops_table = MagicMock()
    shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
        MagicMock(data=shop_data)
    )
    shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    menu_table = MagicMock()
    menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"item_name": "黑糖拿鐵"}]
    )

    db.table.side_effect = lambda name: shops_table if name == "shops" else menu_table
    db.rpc.return_value.execute.return_value = MagicMock(
        data=[{"text": "深夜來也能喝到穩定拿鐵，適合收工後放空。"}]
    )
    db._shops_table = shops_table
    return db


@pytest.mark.asyncio
async def test_handle_generate_embedding_skips_writes_when_job_was_force_failed():
    """Admin force-fail prevents embedding writes from reviving pipeline progress."""
    db = _make_embedding_db()
    embeddings = AsyncMock()
    embeddings.embed.return_value = [0.12, 0.34, 0.56]
    queue = AsyncMock()
    queue.get_status.return_value = None

    await handle_generate_embedding(
        payload={"shop_id": "shop-guard-embed-01"},
        db=db,
        embeddings=embeddings,
        queue=queue,
        job_id="job-guard-embed-01",
    )

    db._shops_table.update.assert_not_called()
    queue.enqueue.assert_not_called()


def _make_summarize_db() -> MagicMock:
    db = MagicMock()
    db.rpc.return_value.execute.return_value = MagicMock(
        data=[
            {"text": "座位舒適、安靜，很多人帶電腦來工作。"},
            {"text": "拿鐵順口，店員親切，午後氛圍放鬆。"},
        ]
    )

    shops_table = MagicMock()
    shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    db.table.side_effect = lambda name: shops_table if name == "shops" else MagicMock()
    db._shops_table = shops_table
    return db


@pytest.mark.asyncio
async def test_handle_summarize_reviews_skips_writes_when_job_was_force_failed():
    """Admin force-fail prevents community summary writes from undoing the abort."""
    db = _make_summarize_db()
    llm = AsyncMock()
    llm.summarize_reviews.return_value = ReviewSummaryResult(
        summary_zh_tw="常客提到環境安靜、拿鐵順口，適合午後工作與放鬆。",
        review_topics=[ReviewTopic(topic="環境安靜", count=5)],
    )
    queue = AsyncMock()
    queue.get_status.return_value = "failed"

    await handle_summarize_reviews(
        payload={"shop_id": "shop-guard-summary-01"},
        db=db,
        llm=llm,
        queue=queue,
        job_id="job-guard-summary-01",
    )

    db._shops_table.update.assert_not_called()
    queue.enqueue.assert_not_called()
