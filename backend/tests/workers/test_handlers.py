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
        _shop_exec = (
            db.table.return_value.select.return_value.eq.return_value.single.return_value.execute
        )
        _shop_exec.return_value = MagicMock(
            data={
                "id": "shop-1",
                "name": "Test Cafe",
                "description": None,
                "categories": [],
                "price_range": None,
                "socket": None,
                "limited_time": None,
                "rating": None,
                "review_count": 0,
            }
        )
        # Reviews data (select().eq().execute())
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await handle_enrich_shop(payload={"shop_id": "shop-1"}, db=db, llm=llm, queue=queue)

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
    def _make_db(
        self,
        shop_data: dict,
        menu_items: list[dict],
        checkin_texts: list[dict] | None = None,
    ) -> tuple[MagicMock, MagicMock, MagicMock]:
        """Return (db, shop_table_mock, menu_table_mock) with correct call chains.

        checkin_texts: rows returned by the RPC (each has 'text' key)
        """
        db = MagicMock()

        shop_table = MagicMock()
        shop_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
            MagicMock(data=shop_data)
        )
        shop_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        menu_table = MagicMock()
        menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=menu_items
        )

        # Community text via RPC
        db.rpc.return_value.execute.return_value = MagicMock(
            data=checkin_texts if checkin_texts is not None else []
        )

        def table_side_effect(name: str):
            return menu_table if name == "shop_menu_items" else shop_table

        db.table.side_effect = table_side_effect
        return db, shop_table, menu_table

    async def test_includes_menu_items_in_embedding_text_when_available(self):
        """When a shop has extracted menu items, they appear after ' | ' in the embedding text."""
        db, _, _ = self._make_db(
            shop_data={
                "name": "虎記商行",
                "description": "台灣老宅改建的咖啡館",
                "processing_status": "live",
            },
            menu_items=[{"item_name": "巴斯克蛋糕"}, {"item_name": "司康"}],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        embed_text = embeddings.embed.call_args[0][0]
        assert "巴斯克蛋糕" in embed_text
        assert "司康" in embed_text
        assert " | " in embed_text

    async def test_embedding_text_unchanged_when_no_menu_items(self):
        """When a shop has no menu items, embedding text is name + description only."""
        db, _, _ = self._make_db(
            shop_data={
                "name": "虎記商行",
                "description": "台灣老宅改建的咖啡館",
                "processing_status": "live",
            },
            menu_items=[],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        embed_text = embeddings.embed.call_args[0][0]
        assert embed_text == "虎記商行. 台灣老宅改建的咖啡館"
        assert " | " not in embed_text

    async def test_live_shop_embedding_updated_in_place_without_status_change(self):
        """Re-embedding a live shop updates only the embedding column — shop stays visible in search."""
        db, shop_table, _ = self._make_db(
            shop_data={
                "name": "虎記商行",
                "description": "台灣老宅改建的咖啡館",
                "processing_status": "live",
            },
            menu_items=[],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        update_data = shop_table.update.call_args[0][0]
        assert "embedding" in update_data
        assert "processing_status" not in update_data
        # No PUBLISH_SHOP job — shop was already live
        queue.enqueue.assert_not_called()

    async def test_new_shop_advances_status_and_queues_publish(self):
        """A new shop going through the pipeline advances to 'publishing' and queues PUBLISH_SHOP."""
        db, shop_table, _ = self._make_db(
            shop_data={
                "name": "虎記商行",
                "description": "台灣老宅改建的咖啡館",
                "processing_status": "embedding",
            },
            menu_items=[],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        update_data = shop_table.update.call_args[0][0]
        assert update_data.get("processing_status") == "publishing"
        queue.enqueue.assert_called_once()
        assert queue.enqueue.call_args.kwargs["job_type"].value == "publish_shop"

    async def test_includes_community_texts_in_embedding_when_available(self):
        """When a shop has check-in reviews, they appear after ' || ' in the embedding text."""
        db, _, _ = self._make_db(
            shop_data={
                "name": "山小孩咖啡",
                "description": "安靜適合工作的獨立咖啡店",
                "processing_status": "live",
            },
            menu_items=[{"item_name": "手沖拿鐵"}],
            checkin_texts=[
                {"text": "超好喝的拿鐵，環境安靜適合工作"},
                {"text": "巴斯克蛋糕是必點的，每次來都會點"},
            ],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        embed_text = embeddings.embed.call_args[0][0]
        assert "超好喝的拿鐵" in embed_text
        assert "巴斯克蛋糕是必點的" in embed_text
        assert " || " in embed_text
        # Menu items still present with single pipe
        assert " | 手沖拿鐵" in embed_text

    async def test_embedding_skips_community_section_when_no_qualifying_texts(self):
        """When no check-in texts qualify (all too short or none exist), no ' || ' in embedding."""
        db, _, _ = self._make_db(
            shop_data={
                "name": "山小孩咖啡",
                "description": "安靜適合工作的獨立咖啡店",
                "processing_status": "live",
            },
            menu_items=[{"item_name": "手沖拿鐵"}],
            checkin_texts=[],  # No qualifying texts
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        embed_text = embeddings.embed.call_args[0][0]
        assert " || " not in embed_text
        # Menu items still work
        assert " | 手沖拿鐵" in embed_text

    async def test_updates_last_embedded_at_after_successful_embedding(self):
        """After generating an embedding, last_embedded_at is set on the shop row."""
        db, shop_table, _ = self._make_db(
            shop_data={
                "name": "山小孩咖啡",
                "description": "安靜適合工作的獨立咖啡店",
                "processing_status": "live",
            },
            menu_items=[],
            checkin_texts=[],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        update_data = shop_table.update.call_args[0][0]
        assert "last_embedded_at" in update_data

    async def test_uses_community_summary_when_available(self):
        """When a shop has community_summary, it replaces raw check-in texts in the embedding."""
        db, _, _ = self._make_db(
            shop_data={
                "name": "山小孩咖啡",
                "description": "安靜適合工作的獨立咖啡店",
                "processing_status": "live",
                "community_summary": "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。",
            },
            menu_items=[{"item_name": "手沖拿鐵"}],
            checkin_texts=[
                {"text": "超好喝的拿鐵，環境安靜適合工作"},
                {"text": "巴斯克蛋糕是必點的"},
            ],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        embed_text = embeddings.embed.call_args[0][0]
        # Community summary used instead of raw texts
        assert "顧客推薦拿鐵和巴斯克蛋糕" in embed_text
        assert " || " in embed_text
        # Raw texts NOT individually present (summary replaced them)
        assert "超好喝的拿鐵，環境安靜適合工作. 巴斯克蛋糕是必點的" not in embed_text

    async def test_falls_back_to_raw_texts_when_community_summary_is_null(self):
        """When community_summary is NULL, raw check-in texts are used (backward compatibility)."""
        db, _, _ = self._make_db(
            shop_data={
                "name": "山小孩咖啡",
                "description": "安靜適合工作的獨立咖啡店",
                "processing_status": "live",
                "community_summary": None,
            },
            menu_items=[],
            checkin_texts=[
                {"text": "超好喝的拿鐵，環境安靜適合工作"},
            ],
        )
        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
        )

        embed_text = embeddings.embed.call_args[0][0]
        assert "超好喝的拿鐵" in embed_text
        assert " || " in embed_text


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
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )

        await handle_smart_staleness_sweep(db=db, scraper=scraper, queue=queue)
        call_args = db.rpc.call_args
        assert call_args[0][0] == "find_stale_shops"
        assert call_args[0][1]["batch_limit"] == 100


class TestEnrichMenuPhotoHandler:
    async def test_replaces_menu_items_and_queues_reembed_when_items_extracted(self):
        """When a menu photo is processed, existing items are replaced and a re-embed is queued."""
        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()

        llm.extract_menu_data = AsyncMock(
            return_value=MagicMock(
                items=[
                    {"name": "巴斯克蛋糕", "price": 120, "category": "dessert"},
                    {"name": "手沖拿鐵", "price": 150, "category": "coffee"},
                ]
            )
        )

        shop_table = MagicMock()
        shop_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        menu_table = MagicMock()
        menu_table.delete.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        menu_table.insert.return_value.execute.return_value = MagicMock(data=[])

        def table_side_effect(name: str):
            return menu_table if name == "shop_menu_items" else shop_table

        db.table.side_effect = table_side_effect

        await handle_enrich_menu_photo(
            payload={
                "shop_id": "shop-zhongshan-01",
                "image_url": "https://storage.example.com/menu.jpg",
            },
            db=db,
            llm=llm,
            queue=queue,
        )

        # DELETE before INSERT (replace-on-extract)
        menu_table.delete.return_value.eq.return_value.execute.assert_called_once()
        # INSERT two items
        menu_table.insert.return_value.execute.assert_called_once()
        inserted = menu_table.insert.call_args[0][0]
        assert len(inserted) == 2
        assert inserted[0]["item_name"] == "巴斯克蛋糕"
        assert inserted[0]["shop_id"] == "shop-zhongshan-01"
        assert inserted[1]["item_name"] == "手沖拿鐵"
        # Dual-write to shops.menu_data
        shop_table.update.assert_called_once()
        # Re-embed queued
        queue.enqueue.assert_called_once()
        assert queue.enqueue.call_args.kwargs["payload"]["shop_id"] == "shop-zhongshan-01"

    async def test_preserves_existing_items_when_extraction_returns_empty(self):
        """When no items are extracted, existing menu items are preserved and no re-embed is queued."""
        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()

        llm.extract_menu_data = AsyncMock(return_value=MagicMock(items=[]))

        await handle_enrich_menu_photo(
            payload={
                "shop_id": "shop-zhongshan-01",
                "image_url": "https://storage.example.com/menu.jpg",
            },
            db=db,
            llm=llm,
            queue=queue,
        )

        # No DB writes, no job queued
        db.table.assert_not_called()
        queue.enqueue.assert_not_called()


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
