from unittest.mock import AsyncMock, MagicMock

from workers.handlers.enrich_menu_photo import handle_enrich_menu_photo
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.staleness_sweep import handle_smart_staleness_sweep, handle_staleness_sweep
from workers.handlers.weekly_email import handle_weekly_email


class TestEnrichShopHandler:
    async def test_deletes_old_tags_before_inserting_new_ones(self):
        """Re-enrichment replaces shop_tags via delete-then-insert, not upsert."""
        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()

        tag_mock = MagicMock(id="tag-cozy")
        llm.enrich_shop = AsyncMock(
            return_value=MagicMock(
                tags=[tag_mock],
                tag_confidences={"tag-cozy": 0.9},
                summary="Cozy cafe",
                mode_scores=None,
            )
        )
        # Shop data (select().eq().single().execute())
        db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                "id": "shop-1", "name": "Test Cafe", "description": None,
                "categories": [], "price_range": None, "socket": None,
                "limited_time": None, "rating": None, "review_count": 0,
            }
        )
        # Reviews data (select().eq().execute())
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        await handle_enrich_shop(
            payload={"shop_id": "shop-1"}, db=db, llm=llm, queue=queue
        )

        # Must delete old tags (not upsert) so stale tags are removed on re-enrichment
        db.table.return_value.delete.return_value.eq.return_value.execute.assert_called_once()
        db.table.return_value.upsert.assert_not_called()

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
                                                    "categories": ["咖啡廳"],
                                                    "price_range": "$200-400",
                                                    "socket": "yes",
                                                    "limited_time": "no",
                                                    "rating": 4.5,
                                                    "review_count": 10,
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

        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-1"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )
        embeddings.embed.assert_called_once()
        queue.enqueue.assert_called_once()  # Should queue publish step


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

    async def test_passes_batch_limit_to_rpc(self):
        """Verify the production dispatch path (smart sweep) passes batch_limit."""
        db = MagicMock()
        queue = AsyncMock()
        scraper = AsyncMock()
        db.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[]))
            )
        )

        await handle_smart_staleness_sweep(db=db, scraper=scraper, queue=queue)
        call_args = db.rpc.call_args
        assert call_args[0][0] == "find_stale_shops"
        assert call_args[0][1]["batch_limit"] == 100


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
