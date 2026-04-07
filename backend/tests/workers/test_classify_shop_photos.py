from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import PhotoCategory


class TestThumbnailUrl:
    def test_rewrites_google_cdn_size_suffix(self):
        from workers.handlers.classify_shop_photos import to_thumbnail_url

        url = "https://lh5.googleusercontent.com/p/AF1Qip_abc=w1920-h1080-k-no"
        result = to_thumbnail_url(url)
        assert result == "https://lh5.googleusercontent.com/p/AF1Qip_abc=w400-h225-k-no"

    def test_passes_through_non_google_urls(self):
        from workers.handlers.classify_shop_photos import to_thumbnail_url

        url = "https://example.com/photo.jpg"
        result = to_thumbnail_url(url)
        assert result == url

    def test_rewrites_single_size_suffix(self):
        from workers.handlers.classify_shop_photos import to_thumbnail_url

        url = "https://lh5.googleusercontent.com/p/AF1Qip_xyz=s1920-k-no"
        result = to_thumbnail_url(url)
        assert result == "https://lh5.googleusercontent.com/p/AF1Qip_xyz=w400-h225-k-no"

    def test_rewrites_size_suffix_when_trailing_path_follows(self):
        from workers.handlers.classify_shop_photos import to_thumbnail_url

        url = "https://lh5.googleusercontent.com/p/AF1Qip_abc=w1920-h1080-k-no/extra"
        result = to_thumbnail_url(url)
        assert result == "https://lh5.googleusercontent.com/p/AF1Qip_abc=w400-h225-k-no/extra"


class TestClassifyShopPhotosHandler:
    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        # Default: existing counts query returns no previously classified photos
        db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.neq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        return db

    @pytest.fixture
    def mock_llm(self):
        return AsyncMock()

    @pytest.fixture
    def mock_queue(self):
        return AsyncMock()

    @pytest.mark.asyncio
    async def test_classifies_unclassified_photos(self, mock_db, mock_llm, mock_queue):
        """Handler fetches NULL-category photos, classifies each, and updates DB."""
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        # Mock: 2 unclassified photos
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "p1",
                    "url": "https://cdn/menu.jpg=w1920-h1080-k-no",
                    "uploaded_at": "2025-06-15T00:00:00+00:00",
                },
                {
                    "id": "p2",
                    "url": "https://cdn/cozy.jpg=w1920-h1080-k-no",
                    "uploaded_at": "2025-05-10T00:00:00+00:00",
                },
            ]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )

        # Mock LLM: first=MENU, second=VIBE
        mock_llm.classify_photo = AsyncMock(side_effect=[PhotoCategory.MENU, PhotoCategory.VIBE])

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-01"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        # Verify classify_photo called with thumbnail URLs
        assert mock_llm.classify_photo.call_count == 2
        thumb_url = mock_llm.classify_photo.call_args_list[0].args[0]
        assert "w400-h225" in thumb_url

    @pytest.mark.asyncio
    async def test_noop_when_no_unclassified_photos(self, mock_db, mock_llm, mock_queue):
        """When all photos are already classified, the handler does nothing."""
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-01"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        mock_llm.classify_photo.assert_not_called()

    @pytest.mark.asyncio
    async def test_menu_cap_enforcement(self, mock_db, mock_llm, mock_queue):
        """When more than 5 photos classify as MENU, extras are downgraded to SKIP."""
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        photos = [
            {
                "id": f"p{i}",
                "url": f"https://cdn/m{i}.jpg=w800-h600-k-no",
                "uploaded_at": f"2025-0{i + 1}-01T00:00:00+00:00",
            }
            for i in range(7)
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=photos
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )

        mock_llm.classify_photo = AsyncMock(return_value=PhotoCategory.MENU)

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-01"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        # Exactly 2 batch update calls (MENU batch + SKIP batch), not 9 individual writes.
        update_calls = mock_db.table.return_value.update.call_args_list
        assert len(update_calls) == 2

        categories_written = {c.args[0]["category"] for c in update_calls}
        assert categories_written == {"MENU", "SKIP"}

        # MENU batch preserves exactly 5 photos (the 5 newest by uploaded_at)
        in_calls = mock_db.table.return_value.update.return_value.in_.call_args_list
        menu_idx = next(i for i, c in enumerate(update_calls) if c.args[0]["category"] == "MENU")
        skip_idx = next(i for i, c in enumerate(update_calls) if c.args[0]["category"] == "SKIP")
        assert len(in_calls[menu_idx].args[1]) == 5
        assert len(in_calls[skip_idx].args[1]) == 2

    @pytest.mark.asyncio
    async def test_menu_cap_enforcement_respects_globally_classified_photos(
        self, mock_db, mock_llm, mock_queue
    ):
        """When 3 MENU photos already exist from a prior run, only 2 new MENU slots remain."""
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        # 4 unclassified photos, all will classify as MENU
        photos = [
            {
                "id": f"p{i}",
                "url": f"https://cdn/m{i}.jpg=w800-h600-k-no",
                "uploaded_at": f"2025-0{i + 1}-01T00:00:00+00:00",
            }
            for i in range(4)
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=photos
        )
        # Simulate 3 already-classified MENU photos from a prior run
        mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.neq.return_value.execute.return_value = MagicMock(
            data=[{"category": "MENU"}, {"category": "MENU"}, {"category": "MENU"}]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )

        mock_llm.classify_photo = AsyncMock(return_value=PhotoCategory.MENU)

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-01"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        # Only 2 slots remain (cap=5, 3 already used). 2 kept as MENU, 2 downgraded to SKIP.
        update_calls = mock_db.table.return_value.update.call_args_list
        categories_written = {c.args[0]["category"] for c in update_calls}
        assert categories_written == {"MENU", "SKIP"}

        in_calls = mock_db.table.return_value.update.return_value.in_.call_args_list
        menu_idx = next(i for i, c in enumerate(update_calls) if c.args[0]["category"] == "MENU")
        skip_idx = next(i for i, c in enumerate(update_calls) if c.args[0]["category"] == "SKIP")
        assert len(in_calls[menu_idx].args[1]) == 2  # 2 new MENU (newest)
        assert len(in_calls[skip_idx].args[1]) == 2  # 2 downgraded to SKIP

    @pytest.mark.asyncio
    async def test_continues_on_single_photo_failure(self, mock_db, mock_llm, mock_queue):
        """If Vision fails on one photo, it is skipped and others are still classified."""
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "p1", "url": "https://cdn/ok.jpg", "uploaded_at": None},
                {"id": "p2", "url": "https://cdn/fail.jpg", "uploaded_at": None},
            ]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )

        mock_llm.classify_photo = AsyncMock(
            side_effect=[PhotoCategory.VIBE, Exception("Vision API error")]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-01"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        # First photo classified (one batch update for VIBE), second skipped (stays NULL)
        update_calls = mock_db.table.return_value.update.call_args_list
        assert len(update_calls) == 1

    @pytest.mark.asyncio
    async def test_enqueue_shop_enrichment_after_all_photos_classified(
        self, mock_db, mock_llm, mock_queue
    ):
        """After classifying all photos for a shop, ENRICH_SHOP is enqueued once."""
        from models.types import JobType
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "p1", "url": "https://cdn/interior.jpg=w800-h600-k-no", "uploaded_at": "2025-06-01T00:00:00+00:00"},
                {"id": "p2", "url": "https://cdn/menu.jpg=w800-h600-k-no", "uploaded_at": "2025-06-02T00:00:00+00:00"},
            ]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )
        mock_llm.classify_photo = AsyncMock(
            side_effect=[PhotoCategory.VIBE, PhotoCategory.MENU]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-enrich-trigger"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        mock_queue.enqueue.assert_called_once()
        enqueue_call = mock_queue.enqueue.call_args
        assert enqueue_call.kwargs["job_type"] == JobType.ENRICH_SHOP
        assert enqueue_call.kwargs["payload"]["shop_id"] == "shop-enrich-trigger"

    @pytest.mark.asyncio
    async def test_enrich_shop_not_enqueued_when_no_photos_to_classify(
        self, mock_db, mock_llm, mock_queue
    ):
        """When there are no unclassified photos, ENRICH_SHOP is NOT enqueued."""
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-no-photos"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        mock_queue.enqueue.assert_not_called()

    @pytest.mark.asyncio
    async def test_enrich_shop_enqueued_once_not_per_photo(
        self, mock_db, mock_llm, mock_queue
    ):
        """ENRICH_SHOP is enqueued once at the end, not once per photo classified."""
        from models.types import JobType
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        photos = [
            {"id": f"p{i}", "url": f"https://cdn/photo{i}.jpg", "uploaded_at": f"2025-06-0{i + 1}T00:00:00+00:00"}
            for i in range(5)
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=photos
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )
        mock_llm.classify_photo = AsyncMock(return_value=PhotoCategory.VIBE)

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-multi-photo"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        # Exactly one ENRICH_SHOP enqueue despite 5 photos being classified
        enrich_enqueue_calls = [
            c for c in mock_queue.enqueue.call_args_list
            if c.kwargs.get("job_type") == JobType.ENRICH_SHOP
        ]
        assert len(enrich_enqueue_calls) == 1
