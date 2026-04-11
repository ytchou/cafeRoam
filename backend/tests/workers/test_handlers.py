from unittest.mock import AsyncMock, MagicMock

from workers.handlers.enrich_menu_photo import handle_enrich_menu_photo
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.weekly_email import handle_weekly_email


class TestEnrichShopHandler:
    async def test_deletes_old_tags_before_inserting_new_ones(self):
        """Re-enrichment replaces shop_tags via delete-then-insert, not upsert."""
        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()
        queue.get_status.return_value = "claimed"

        tag_mock = MagicMock(id="tag-cozy")
        llm.enrich_shop = AsyncMock(
            return_value=MagicMock(
                tags=[tag_mock],
                tag_confidences={"tag-cozy": 0.9},
                summary="溫馨的咖啡廳，適合放鬆閱讀",
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

        await handle_enrich_shop(
            payload={"shop_id": "shop-1"},
            db=db,
            llm=llm,
            queue=queue,
            job_id="job-handlers-enrich-01",
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
                summary="溫馨的獨立咖啡廳，提供優質手沖咖啡",
                confidence=0.9,
                mode_scores=None,
                model_dump=MagicMock(
                    return_value={
                        "tags": [],
                        "summary": "溫馨的獨立咖啡廳，提供優質手沖咖啡",
                        "confidence": 0.9,
                        "mode_scores": None,
                    }
                ),
            )
        )
        queue = AsyncMock()
        queue.get_status.return_value = "claimed"

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
            job_id="job-handlers-enrich-02",
        )
        llm.enrich_shop.assert_called_once()
        queue.enqueue.assert_called_once()  # Should queue embedding generation

    async def test_menu_highlights_and_coffee_origins_written_to_db(self):
        """When enrichment extracts menu items and origins, both are persisted to the shops table."""
        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()

        llm.enrich_shop = AsyncMock(
            return_value=MagicMock(
                tags=[],
                tag_confidences={},
                summary="精品咖啡店，提供多種手沖選擇",
                confidence=0.9,
                mode_scores=None,
                menu_highlights=["巴斯克蛋糕", "手沖咖啡"],
                coffee_origins=["耶加雪菲", "哥倫比亞"],
            )
        )
        llm.assign_tarot = AsyncMock(return_value=MagicMock(tarot_title=None, flavor_text=""))
        queue.get_status.return_value = "claimed"

        db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                "id": "shop-精品-1",
                "name": "晨光精品咖啡",
                "description": None,
                "categories": ["精品咖啡"],
                "price_range": "$$",
                "socket": "yes",
                "limited_time": "no",
                "rating": 4.8,
                "review_count": 123,
            }
        )
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"text": "提供耶加雪菲和哥倫比亞豆，烘焙得恰到好處"}]
        )

        await handle_enrich_shop(
            payload={"shop_id": "shop-精品-1"},
            db=db,
            llm=llm,
            queue=queue,
            job_id="job-handlers-enrich-03",
        )

        update_calls = db.table.return_value.update.call_args_list
        shop_update_payloads = [c.args[0] for c in update_calls if "menu_highlights" in c.args[0]]
        assert len(shop_update_payloads) >= 1, "Expected shops.update to include menu_highlights"
        written = shop_update_payloads[0]
        assert written["menu_highlights"] == ["巴斯克蛋糕", "手沖咖啡"]
        assert written["coffee_origins"] == ["耶加雪菲", "哥倫比亞"]


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

        job_queue_table = MagicMock()
        job_queue_table.update.return_value.eq.return_value.execute.return_value = MagicMock()

        def table_side_effect(name: str):
            if name == "shop_menu_items":
                return menu_table
            if name == "job_queue":
                return job_queue_table
            return shop_table

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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-01",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-02",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-03",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-taipei-01"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-09",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-04",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-05",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-06",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-07",
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
        queue.get_status.return_value = "claimed"

        await handle_generate_embedding(
            payload={"shop_id": "shop-d4e5f6"},
            db=db,
            embeddings=embeddings,
            queue=queue,
            job_id="job-handlers-embed-08",
        )

        embed_text = embeddings.embed.call_args[0][0]
        assert "超好喝的拿鐵" in embed_text
        assert " || " in embed_text


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


class TestEnrichShopHandlerGuard:
    async def test_enrich_shop_aborts_write_when_cancelled_midflight(self):
        """When a job is cancelled mid-flight, enrich_shop returns early without writing to shops."""
        from unittest.mock import patch

        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()

        tag_mock = MagicMock(id="tag-cozy")
        llm.enrich_shop = AsyncMock(
            return_value=MagicMock(
                tags=[tag_mock],
                tag_confidences={"tag-cozy": 0.9},
                summary="溫馨的咖啡廳，適合放鬆閱讀",
                mode_scores=None,
                menu_highlights=[],
                coffee_origins=[],
            )
        )
        llm.assign_tarot = AsyncMock(return_value=MagicMock(tarot_title=None, flavor_text=""))

        db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                "id": "shop-guard-1",
                "name": "防護測試咖啡",
                "description": None,
                "categories": [],
                "price_range": None,
                "socket": None,
                "limited_time": None,
                "rating": None,
                "review_count": 0,
                "google_maps_features": {},
            }
        )
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch("workers.handlers.enrich_shop.check_job_still_claimed", return_value=False):
            await handle_enrich_shop(
                payload={"shop_id": "shop-guard-1"},
                db=db,
                llm=llm,
                queue=queue,
                job_id="job-cancelled-1",
            )

        # The shops update (writing enrichment results) must NOT be called
        # when the job was cancelled mid-flight
        update_calls = db.table.return_value.update.call_args_list
        enrichment_writes = [c for c in update_calls if c.args and "description" in c.args[0]]
        assert len(enrichment_writes) == 0, (
            "shops.update with description should not be called when job is cancelled"
        )


class TestGenerateEmbeddingHandlerGuard:
    async def test_generate_embedding_aborts_write_when_cancelled_midflight(self):
        """When a job is cancelled mid-flight, generate_embedding returns early without writing embedding."""
        from unittest.mock import patch

        db = MagicMock()
        shop_table = MagicMock()
        shop_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
            MagicMock(
                data={
                    "name": "防護測試咖啡",
                    "description": "台灣老宅咖啡館",
                    "processing_status": "embedding",
                    "community_summary": None,
                }
            )
        )
        shop_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        menu_table = MagicMock()
        menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        def table_side_effect(name: str):
            return menu_table if name == "shop_menu_items" else shop_table

        db.table.side_effect = table_side_effect
        db.rpc.return_value.execute.return_value = MagicMock(data=[])

        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        with patch(
            "workers.handlers.generate_embedding.check_job_still_claimed", return_value=False
        ):
            await handle_generate_embedding(
                payload={"shop_id": "shop-guard-2"},
                db=db,
                embeddings=embeddings,
                queue=queue,
                job_id="job-cancelled-2",
            )

        # The shops.update with embedding must NOT be called
        shop_table.update.assert_not_called()


class TestSummarizeReviewsHandlerGuard:
    async def test_summarize_reviews_aborts_write_when_cancelled_midflight(self):
        """When a job is cancelled mid-flight, summarize_reviews returns early without writing community_summary."""
        from unittest.mock import patch

        from models.types import ReviewSummaryResult, ReviewTopic
        from workers.handlers.summarize_reviews import handle_summarize_reviews

        db = MagicMock()
        db.rpc.return_value.execute.return_value = MagicMock(
            data=[{"text": "超好喝的拿鐵，環境安靜適合工作，每次來都很享受"}]
        )
        db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(
            return_value=ReviewSummaryResult(
                summary_zh_tw="溫馨的咖啡廳社群總結，適合各種場合",
                review_topics=[ReviewTopic(topic="環境安靜", count=3)],
            )
        )
        queue = AsyncMock()

        with patch(
            "workers.handlers.summarize_reviews.check_job_still_claimed", return_value=False
        ):
            await handle_summarize_reviews(
                payload={"shop_id": "shop-guard-3"},
                db=db,
                llm=llm,
                queue=queue,
                job_id="job-cancelled-3",
            )

        # The shops.update with community_summary must NOT be called
        update_calls = db.table.return_value.update.call_args_list
        summary_writes = [c for c in update_calls if c.args and "community_summary" in c.args[0]]
        assert len(summary_writes) == 0, (
            "shops.update with community_summary should not be called when job is cancelled"
        )


class TestEnrichShopMilestoneLogs:
    async def test_enrich_shop_emits_milestone_logs(self):
        """When enrich_shop completes successfully, it emits job.start, llm.call, db.write, job.end milestones."""
        from unittest.mock import patch

        db = MagicMock()
        llm = AsyncMock()
        queue = AsyncMock()

        llm.enrich_shop = AsyncMock(
            return_value=MagicMock(
                tags=[],
                tag_confidences={},
                summary="溫馨的獨立咖啡廳，提供優質手沖咖啡",
                mode_scores=None,
                menu_highlights=[],
                coffee_origins=[],
            )
        )
        llm.assign_tarot = AsyncMock(return_value=MagicMock(tarot_title=None, flavor_text=""))

        db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                "id": "shop-milestone-1",
                "name": "里程碑咖啡",
                "description": None,
                "categories": [],
                "price_range": None,
                "socket": None,
                "limited_time": None,
                "rating": None,
                "review_count": 0,
                "google_maps_features": {},
            }
        )
        db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        guard_path = "workers.handlers.enrich_shop.check_job_still_claimed"
        with (
            patch("workers.handlers.enrich_shop.log_job_event") as mock_log,
            patch(guard_path, return_value=True),
        ):
            await handle_enrich_shop(
                payload={"shop_id": "shop-milestone-1"},
                db=db,
                llm=llm,
                queue=queue,
                job_id="job-milestone-1",
            )

        messages = [c.args[3] for c in mock_log.call_args_list]
        assert "job.start" in messages
        assert "llm.call" in messages
        assert "db.write" in messages
        assert "job.end" in messages
        assert "job.error" not in messages

        # Verify order: job.start must come before llm.call, db.write, job.end
        start_idx = messages.index("job.start")
        llm_idx = messages.index("llm.call")
        db_idx = messages.index("db.write")
        end_idx = messages.index("job.end")
        assert start_idx < llm_idx < db_idx < end_idx


class TestGenerateEmbeddingMilestoneLogs:
    async def test_generate_embedding_emits_milestone_logs(self):
        """When generate_embedding completes successfully, it emits job.start, llm.call, db.write, job.end milestones."""
        from unittest.mock import patch

        db = MagicMock()
        shop_table = MagicMock()
        shop_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
            MagicMock(
                data={
                    "name": "里程碑咖啡",
                    "description": "台灣老宅咖啡館",
                    "processing_status": "embedding",
                    "community_summary": None,
                }
            )
        )
        shop_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        menu_table = MagicMock()
        menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        def table_side_effect(name: str):
            return menu_table if name == "shop_menu_items" else shop_table

        db.table.side_effect = table_side_effect
        db.rpc.return_value.execute.return_value = MagicMock(data=[])

        embeddings = AsyncMock()
        embeddings.embed = AsyncMock(return_value=[0.1] * 1536)
        queue = AsyncMock()

        guard_path = "workers.handlers.generate_embedding.check_job_still_claimed"
        with (
            patch("workers.handlers.generate_embedding.log_job_event") as mock_log,
            patch(guard_path, return_value=True),
        ):
            await handle_generate_embedding(
                payload={"shop_id": "shop-milestone-2"},
                db=db,
                embeddings=embeddings,
                queue=queue,
                job_id="job-milestone-2",
            )

        messages = [c.args[3] for c in mock_log.call_args_list]
        assert "job.start" in messages
        assert "llm.call" in messages
        assert "db.write" in messages
        assert "job.end" in messages
        assert "job.error" not in messages

        start_idx = messages.index("job.start")
        llm_idx = messages.index("llm.call")
        db_idx = messages.index("db.write")
        end_idx = messages.index("job.end")
        assert start_idx < llm_idx < db_idx < end_idx


class TestSummarizeReviewsMilestoneLogs:
    async def test_summarize_reviews_emits_milestone_logs(self):
        """When summarize_reviews completes successfully, it emits job.start, llm.call, db.write, job.end milestones."""
        from unittest.mock import patch

        from models.types import ReviewSummaryResult, ReviewTopic
        from workers.handlers.summarize_reviews import handle_summarize_reviews

        db = MagicMock()
        db.rpc.return_value.execute.return_value = MagicMock(
            data=[{"text": "超好喝的拿鐵，環境安靜適合工作，每次來都很享受"}]
        )
        db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        llm = AsyncMock()
        llm.summarize_reviews = AsyncMock(
            return_value=ReviewSummaryResult(
                summary_zh_tw="溫馨的咖啡廳社群總結，適合各種場合休憩",
                review_topics=[ReviewTopic(topic="環境安靜", count=4)],
            )
        )
        queue = AsyncMock()

        guard_path = "workers.handlers.summarize_reviews.check_job_still_claimed"
        with (
            patch("workers.handlers.summarize_reviews.log_job_event") as mock_log,
            patch(guard_path, return_value=True),
        ):
            await handle_summarize_reviews(
                payload={"shop_id": "shop-milestone-3"},
                db=db,
                llm=llm,
                queue=queue,
                job_id="job-milestone-3",
            )

        messages = [c.args[3] for c in mock_log.call_args_list]
        assert "job.start" in messages
        assert "llm.call" in messages
        assert "db.write" in messages
        assert "job.end" in messages
        assert "job.error" not in messages

        start_idx = messages.index("job.start")
        llm_idx = messages.index("llm.call")
        db_idx = messages.index("db.write")
        end_idx = messages.index("job.end")
        assert start_idx < llm_idx < db_idx < end_idx
