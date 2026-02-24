from unittest.mock import AsyncMock, MagicMock

from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.staleness_sweep import handle_staleness_sweep


class TestEnrichShopHandler:
    async def test_loads_shop_calls_llm_writes_result(self):
        db = MagicMock()
        llm = AsyncMock()
        llm.enrich_shop = AsyncMock(return_value=MagicMock(
            tags=[], summary="A cozy cafe", confidence=0.9, mode_scores=None,
            model_dump=MagicMock(return_value={
                "tags": [], "summary": "A cozy cafe", "confidence": 0.9, "mode_scores": None,
            }),
        ))
        queue = AsyncMock()

        db.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    single=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data={
                            "id": "shop-1",
                            "name": "Test Cafe",
                            "description": None,
                        }))
                    ))
                ))
            )),
            update=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(data=[]))
                ))
            )),
        ))

        await handle_enrich_shop(
            payload={"shop_id": "shop-1"},
            db=db,
            llm=llm,
            queue=queue,
        )
        llm.enrich_shop.assert_called_once()
        queue.enqueue.assert_called_once()  # Should queue embedding generation


class TestGenerateEmbeddingHandler:
    async def test_generates_embedding_and_stores(self):
        db = MagicMock()
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)

        db.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    single=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data={
                            "id": "shop-1",
                            "name": "Test Cafe",
                            "description": "A cozy cafe",
                        }))
                    ))
                ))
            )),
            update=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(data=[]))
                ))
            )),
        ))

        await handle_generate_embedding(
            payload={"shop_id": "shop-1"},
            db=db,
            embeddings=embeddings,
        )
        embeddings.embed.assert_called_once()


class TestStalenessSweepHandler:
    async def test_queues_enrichment_for_stale_shops(self):
        db = MagicMock()
        queue = AsyncMock()

        # Return 2 stale shops
        db.rpc = MagicMock(return_value=MagicMock(
            execute=MagicMock(return_value=MagicMock(data=[
                {"id": "shop-1"},
                {"id": "shop-2"},
            ]))
        ))

        await handle_staleness_sweep(db=db, queue=queue)
        assert queue.enqueue.call_count == 2
