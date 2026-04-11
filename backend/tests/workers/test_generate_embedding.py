"""Tests for the generate_embedding worker handler."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from workers.handlers.generate_embedding import handle_generate_embedding


def _make_db(processing_status: str = "embedding") -> MagicMock:
    db = MagicMock()

    shop_data = {
        "name": "蒸氣實驗室",
        "description": "專注義式濃縮的都市咖啡廳。",
        "processing_status": processing_status,
        "community_summary": None,
    }

    shops_table = MagicMock()
    shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
        MagicMock(data=shop_data)
    )
    shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    menu_table = MagicMock()
    menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    rpc_mock = MagicMock()
    rpc_mock.execute.return_value = MagicMock(data=[])

    def table_router(name: str) -> MagicMock:
        if name == "shops":
            return shops_table
        if name == "shop_menu_items":
            return menu_table
        return MagicMock()

    db.table.side_effect = table_router
    db.rpc.return_value = rpc_mock
    db._shops_table = shops_table
    return db


@pytest.mark.asyncio
async def test_embedding_failure_marks_pipeline_shop_failed():
    """When embed() raises for a pipeline shop (status=embedding), rejection_reason is written."""
    db = _make_db(processing_status="embedding")
    embeddings = AsyncMock()
    embeddings.embed = AsyncMock(side_effect=RuntimeError("OpenAI rate limit exceeded"))
    queue = AsyncMock()
    queue.get_status.return_value = "claimed"

    with pytest.raises(RuntimeError, match="OpenAI rate limit exceeded"):
        await handle_generate_embedding(
            payload={"shop_id": "shop-embed-test"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-embed-fail-01",
        )

    update_data = db._shops_table.update.call_args[0][0]
    assert update_data["processing_status"] == "failed"
    assert update_data["rejection_reason"].startswith("Embedding error:")
    queue.enqueue.assert_not_called()


@pytest.mark.asyncio
async def test_embedding_failure_does_not_fail_live_shop():
    """When embed() raises for a live shop (re-embed), processing_status must NOT be set to failed.

    Live shops re-embed without status advancement (should_advance=False). An embedding
    failure should not remove the shop from search by setting it to 'failed'.
    """
    db = _make_db(processing_status="live")
    embeddings = AsyncMock()
    embeddings.embed = AsyncMock(side_effect=RuntimeError("Embedding provider unreachable"))
    queue = AsyncMock()
    queue.get_status.return_value = "claimed"

    with pytest.raises(RuntimeError):
        await handle_generate_embedding(
            payload={"shop_id": "shop-live-embed-test"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-embed-live-02",
        )

    # No update should have set processing_status to "failed"
    failed_updates = [
        c
        for c in db._shops_table.update.call_args_list
        if c.args and c.args[0].get("processing_status") == "failed"
    ]
    assert not failed_updates, "Live shop must not be marked failed on embedding error"


@pytest.mark.asyncio
async def test_generate_embedding_writes_step_timings_to_db():
    shop_id = "shop-id-001"
    job_id = "job-id-001"

    from models.types import JobStatus

    mock_embeddings = AsyncMock()
    mock_embeddings.embed.return_value = [0.1] * 1536

    shop_data = {
        "name": "測試咖啡館",
        "description": "舒適的咖啡廳，適合工作。",
        "processing_status": "embedding",
        "community_summary": "社區評語：咖啡好喝。",
    }

    shops_table = MagicMock()
    shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
        MagicMock(data=shop_data)
    )
    shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock()

    menu_table = MagicMock()
    menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    job_queue_table = MagicMock()
    job_queue_table.update.return_value.eq.return_value.execute.return_value = MagicMock()

    def table_router(name: str) -> MagicMock:
        if name == "shops":
            return shops_table
        if name == "shop_menu_items":
            return menu_table
        if name == "job_queue":
            return job_queue_table
        return MagicMock()

    db = MagicMock()
    db.table.side_effect = table_router

    queue = AsyncMock()
    queue.get_status.return_value = JobStatus.CLAIMED

    await handle_generate_embedding(
        payload={"shop_id": shop_id},
        db=db,
        embeddings=mock_embeddings,
        queue=queue,
        job_id=job_id,
    )

    job_queue_updates = [
        call for call in job_queue_table.update.call_args_list if "step_timings" in call[0][0]
    ]
    assert len(job_queue_updates) == 1
    timings = job_queue_updates[0][0][0]["step_timings"]
    assert set(timings.keys()) == {"fetch_text", "embed_call", "db_write"}
    for v in timings.values():
        assert isinstance(v["duration_ms"], int)
        assert v["duration_ms"] >= 0
