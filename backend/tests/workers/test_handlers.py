from unittest.mock import AsyncMock, MagicMock

from workers.handlers.enrich_menu_photo import handle_enrich_menu_photo
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.staleness_sweep import handle_staleness_sweep
from workers.handlers.weekly_email import handle_weekly_email


class TestEnrichShopHandler:
    async def test_loads_shop_calls_llm_writes_result(self):
        db = MagicMock()
        llm = AsyncMock()
        llm.enrich_shop = AsyncMock(
            return_value=MagicMock(
                tags=[],
                summary="A cozy cafe",
                confidence=0.9,
                mode_scores=None,
                model_dump=MagicMock(
                    return_value={
                        "tags": [],
                        "summary": "A cozy cafe",
                        "confidence": 0.9,
                        "mode_scores": None,
                    }
                ),
            )
        )
        queue = AsyncMock()

        db.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                single=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(
                                            return_value=MagicMock(
                                                data={
                                                    "id": "shop-1",
                                                    "name": "Test Cafe",
                                                    "description": None,
                                                }
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                execute=MagicMock(return_value=MagicMock(data=[]))
                            )
                        )
                    )
                ),
            )
        )

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

        db.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                single=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(
                                            return_value=MagicMock(
                                                data={
                                                    "id": "shop-1",
                                                    "name": "Test Cafe",
                                                    "description": "A cozy cafe",
                                                }
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                execute=MagicMock(return_value=MagicMock(data=[]))
                            )
                        )
                    )
                ),
            )
        )

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
        db.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(
                    return_value=MagicMock(
                        data=[
                            {"id": "shop-1"},
                            {"id": "shop-2"},
                        ]
                    )
                )
            )
        )

        await handle_staleness_sweep(db=db, queue=queue)
        assert queue.enqueue.call_count == 2


class TestEnrichMenuPhotoHandler:
    async def test_calls_llm_and_updates_shop_menu_data(self):
        db = MagicMock()
        llm = AsyncMock()
        llm.extract_menu_data = AsyncMock(
            return_value=MagicMock(
                items=["Cappuccino", "Latte"],
            )
        )
        db.table = MagicMock(
            return_value=MagicMock(
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                execute=MagicMock(return_value=MagicMock(data=[]))
                            )
                        )
                    )
                )
            )
        )

        await handle_enrich_menu_photo(
            payload={"shop_id": "shop-1", "image_url": "https://example.com/menu.jpg"},
            db=db,
            llm=llm,
        )
        llm.extract_menu_data.assert_called_once_with(image_url="https://example.com/menu.jpg")
        db.table.return_value.update.assert_called_once()

    async def test_skips_update_when_no_items_extracted(self):
        db = MagicMock()
        llm = AsyncMock()
        llm.extract_menu_data = AsyncMock(return_value=MagicMock(items=[]))

        await handle_enrich_menu_photo(
            payload={"shop_id": "shop-1", "image_url": "https://example.com/menu.jpg"},
            db=db,
            llm=llm,
        )
        db.table.assert_not_called()


class TestWeeklyEmailHandler:
    async def test_sends_email_to_all_opted_in_users(self):
        db = MagicMock()
        email = AsyncMock()
        db.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                execute=MagicMock(
                                    return_value=MagicMock(
                                        data=[
                                            {"id": "user-1", "email": "user1@example.com"},
                                            {"id": "user-2", "email": "user2@example.com"},
                                        ]
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )

        await handle_weekly_email(db=db, email=email)
        assert email.send.call_count == 2

    async def test_continues_sending_after_individual_failure(self):
        """A single send failure must not abort the rest of the batch."""
        db = MagicMock()
        email = AsyncMock()
        email.send.side_effect = [Exception("SMTP error"), None]
        db.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                execute=MagicMock(
                                    return_value=MagicMock(
                                        data=[
                                            {"id": "user-1", "email": "fail@example.com"},
                                            {"id": "user-2", "email": "ok@example.com"},
                                        ]
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )

        await handle_weekly_email(db=db, email=email)
        assert email.send.call_count == 2  # Both attempted despite first failure
