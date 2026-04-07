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
        shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
            MagicMock(data=shop_data)
        )
        shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        shop_tags_table = MagicMock()
        shop_tags_table.delete.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
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

        update_data = db._shops_table.update.call_args[0][0]
        assert update_data["processing_status"] == "failed"
        assert update_data["rejection_reason"] == "Enrichment failed: summary not in Traditional Chinese"
        queue.enqueue.assert_not_called()


class TestEnrichShopVibePhotos:
    """Validate that vibe photos are queried and passed as image blocks to the LLM."""

    def _make_db(self, vibe_photos: list[dict]) -> MagicMock:
        db = MagicMock()

        shop_data = {
            "id": "shop-photo-test",
            "name": "光合作用咖啡",
            "description": None,
            "categories": ["cafe"],
            "price_range": "$$",
            "socket": "yes",
            "limited_time": "no",
            "rating": 4.6,
            "review_count": 85,
        }
        reviews_data = [{"text": "空間很舒適，適合閱讀"}]

        shops_table = MagicMock()
        shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
            MagicMock(data=shop_data)
        )
        shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        shop_tags_table = MagicMock()
        shop_tags_table.delete.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        shop_tags_table.insert.return_value.execute.return_value = MagicMock(data=[])

        shop_reviews_table = MagicMock()
        shop_reviews_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=reviews_data
        )

        # shop_photos table: returns vibe photos when filtered by category='VIBE'
        shop_photos_table = MagicMock()
        shop_photos_table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
            data=vibe_photos
        )

        def table_router(name: str) -> MagicMock:
            if name == "shops":
                return shops_table
            if name == "shop_tags":
                return shop_tags_table
            if name == "shop_reviews":
                return shop_reviews_table
            if name == "shop_photos":
                return shop_photos_table
            return MagicMock()

        db.table.side_effect = table_router
        db._shops_table = shops_table
        db._shop_photos_table = shop_photos_table
        return db

    def _make_enrichment_result(self) -> EnrichmentResult:
        return EnrichmentResult(
            tags=[],
            tag_confidences={},
            summary="光線充足的角落咖啡廳，適合安靜閱讀與工作。",
            confidence=0.8,
            mode_scores=ShopModeScores(work=0.7, rest=0.3, social=0.0),
            menu_highlights=["拿鐵"],
            coffee_origins=[],
        )

    @pytest.mark.asyncio
    async def test_vibe_photos_are_queried_and_passed_to_llm(self):
        """Given VIBE photos exist, enrich_shop queries them and passes vibe_photo_urls to LLM."""
        vibe_photos = [
            {"url": "https://cdn/vibe1.jpg"},
            {"url": "https://cdn/vibe2.jpg"},
            {"url": "https://cdn/vibe3.jpg"},
        ]
        db = self._make_db(vibe_photos)

        captured_input: list = []

        async def capture_enrich(shop_input):
            captured_input.append(shop_input)
            return self._make_enrichment_result()

        llm = AsyncMock()
        llm.enrich_shop = capture_enrich
        llm.assign_tarot = AsyncMock(
            return_value=TarotEnrichmentResult(tarot_title=None, flavor_text="")
        )
        queue = AsyncMock()

        await handle_enrich_shop(
            payload={"shop_id": "shop-photo-test"},
            db=db,
            llm=llm,
            queue=queue,
        )

        assert len(captured_input) == 1
        enrichment_input = captured_input[0]
        assert enrichment_input.vibe_photo_urls == [
            "https://cdn/vibe1.jpg",
            "https://cdn/vibe2.jpg",
            "https://cdn/vibe3.jpg",
        ]

    @pytest.mark.asyncio
    async def test_no_vibe_photos_passes_empty_list_to_llm(self):
        """Given no VIBE photos, enrich_shop passes vibe_photo_urls=[] — backward compat."""
        db = self._make_db(vibe_photos=[])

        captured_input: list = []

        async def capture_enrich(shop_input):
            captured_input.append(shop_input)
            return self._make_enrichment_result()

        llm = AsyncMock()
        llm.enrich_shop = capture_enrich
        llm.assign_tarot = AsyncMock(
            return_value=TarotEnrichmentResult(tarot_title=None, flavor_text="")
        )
        queue = AsyncMock()

        await handle_enrich_shop(
            payload={"shop_id": "shop-photo-test"},
            db=db,
            llm=llm,
            queue=queue,
        )

        assert len(captured_input) == 1
        assert captured_input[0].vibe_photo_urls == []


class TestEnrichShopGoogleMapsFeatures:
    """Validate that google_maps_features is read from the DB and passed to the LLM."""

    def _make_db(self, google_maps_features: dict) -> MagicMock:
        db = MagicMock()

        shop_data = {
            "id": "shop-features-test",
            "name": "戶外咖啡廳",
            "description": None,
            "categories": ["cafe"],
            "price_range": "$",
            "socket": None,
            "limited_time": None,
            "rating": 4.2,
            "review_count": 50,
            "google_maps_features": google_maps_features,
        }
        reviews_data: list = []

        shops_table = MagicMock()
        shops_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
            MagicMock(data=shop_data)
        )
        shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        shop_tags_table = MagicMock()
        shop_tags_table.delete.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        shop_tags_table.insert.return_value.execute.return_value = MagicMock(data=[])

        shop_reviews_table = MagicMock()
        shop_reviews_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=reviews_data
        )

        shop_photos_table = MagicMock()
        shop_photos_table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )

        def table_router(name: str) -> MagicMock:
            if name == "shops":
                return shops_table
            if name == "shop_tags":
                return shop_tags_table
            if name == "shop_reviews":
                return shop_reviews_table
            if name == "shop_photos":
                return shop_photos_table
            return MagicMock()

        db.table.side_effect = table_router
        return db

    @pytest.mark.asyncio
    async def test_google_maps_features_from_db_passed_to_llm(self):
        """Given google_maps_features stored in DB, enrich_shop reads and passes them to LLM."""
        features = {"outdoor_seating": True, "wifi_available": True}
        db = self._make_db(google_maps_features=features)

        captured_input: list = []

        async def capture_enrich(shop_input):
            captured_input.append(shop_input)
            return EnrichmentResult(
                tags=[],
                tag_confidences={},
                summary="寬敞的戶外咖啡廳，適合悠閒午後。",
                confidence=0.75,
                mode_scores=ShopModeScores(work=0.3, rest=0.7, social=0.2),
                menu_highlights=[],
                coffee_origins=[],
            )

        llm = AsyncMock()
        llm.enrich_shop = capture_enrich
        llm.assign_tarot = AsyncMock(
            return_value=TarotEnrichmentResult(tarot_title=None, flavor_text="")
        )
        queue = AsyncMock()

        await handle_enrich_shop(
            payload={"shop_id": "shop-features-test"},
            db=db,
            llm=llm,
            queue=queue,
        )

        assert len(captured_input) == 1
        assert captured_input[0].google_maps_features == features

    @pytest.mark.asyncio
    async def test_missing_google_maps_features_column_defaults_to_empty_dict(self):
        """When google_maps_features is absent from DB row (None), enrich_shop passes {}."""
        db = self._make_db(google_maps_features=None)  # type: ignore[arg-type]

        captured_input: list = []

        async def capture_enrich(shop_input):
            captured_input.append(shop_input)
            return EnrichmentResult(
                tags=[],
                tag_confidences={},
                summary="安靜的小咖啡廳，以手沖咖啡聞名。",
                confidence=0.8,
                mode_scores=ShopModeScores(work=0.6, rest=0.4, social=0.1),
                menu_highlights=[],
                coffee_origins=[],
            )

        llm = AsyncMock()
        llm.enrich_shop = capture_enrich
        llm.assign_tarot = AsyncMock(
            return_value=TarotEnrichmentResult(tarot_title=None, flavor_text="")
        )
        queue = AsyncMock()

        await handle_enrich_shop(
            payload={"shop_id": "shop-features-test"},
            db=db,
            llm=llm,
            queue=queue,
        )

        assert len(captured_input) == 1
        assert captured_input[0].google_maps_features == {}


class TestEnrichShopLLMImageBlocks:
    """Validate that AnthropicLLMAdapter builds image content blocks when vibe_photo_urls present."""

    def _make_adapter(self):
        from providers.llm.anthropic_adapter import AnthropicLLMAdapter

        return AnthropicLLMAdapter(
            api_key="test-key",
            model="claude-opus-4-5",
            taxonomy=[],
            classify_model="claude-haiku-3-5",
        )

    def test_image_blocks_included_when_vibe_photos_present(self):
        """Given vibe_photo_urls, _build_enrich_messages returns image content blocks."""
        from models.types import ShopEnrichmentInput

        adapter = self._make_adapter()
        shop = ShopEnrichmentInput(
            name="光合作用咖啡",
            reviews=["環境舒適"],
            vibe_photo_urls=["https://cdn/v1.jpg", "https://cdn/v2.jpg"],
        )

        messages = adapter._build_enrich_messages(shop)

        # Should be a list with a user message that has a list of content blocks
        assert len(messages) == 1
        user_message = messages[0]
        assert user_message["role"] == "user"
        content = user_message["content"]
        assert isinstance(content, list)

        # Find image blocks
        image_blocks = [b for b in content if b.get("type") == "image"]
        assert len(image_blocks) == 2
        assert image_blocks[0]["source"]["url"] == "https://cdn/v1.jpg"
        assert image_blocks[1]["source"]["url"] == "https://cdn/v2.jpg"

        # Find text block with context prefix
        text_blocks = [b for b in content if b.get("type") == "text"]
        assert any(
            "physical space" in b["text"].lower() or "vibe" in b["text"].lower()
            for b in text_blocks
        )

    def test_no_image_blocks_when_vibe_photos_empty(self):
        """Given vibe_photo_urls=[], _build_enrich_messages returns plain string content."""
        from models.types import ShopEnrichmentInput

        adapter = self._make_adapter()
        shop = ShopEnrichmentInput(
            name="光合作用咖啡",
            reviews=["環境舒適"],
            vibe_photo_urls=[],
        )

        messages = adapter._build_enrich_messages(shop)

        assert len(messages) == 1
        user_message = messages[0]
        # Without photos, content should be a plain string (existing behavior)
        assert isinstance(user_message["content"], str)
