from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import JobType, PhotoCategory
from workers.handlers.classify_shop_photos import handle_classify_shop_photos

SHOP_ID = "shop-menu-trigger-01"


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
                {
                    "id": "p1",
                    "url": "https://cdn/interior.jpg=w800-h600-k-no",
                    "uploaded_at": "2025-06-01T00:00:00+00:00",
                },
                {
                    "id": "p2",
                    "url": "https://cdn/menu.jpg=w800-h600-k-no",
                    "uploaded_at": "2025-06-02T00:00:00+00:00",
                },
            ]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )
        mock_llm.classify_photo = AsyncMock(side_effect=[PhotoCategory.VIBE, PhotoCategory.MENU])

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
    async def test_enrich_shop_enqueued_when_no_photos_to_classify(
        self, mock_db, mock_llm, mock_queue
    ):
        """When there are no unclassified photos, ENRICH_SHOP is still enqueued to advance the pipeline."""
        from models.types import JobType
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        # Unclassified photos query returns empty
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )
        # Submission context query returns no submission
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": "shop-no-photos"},
            db=mock_db,
            llm=mock_llm,
            queue=mock_queue,
        )

        mock_queue.enqueue.assert_called_once()
        enqueue_call = mock_queue.enqueue.call_args
        assert enqueue_call.kwargs["job_type"] == JobType.ENRICH_SHOP
        assert enqueue_call.kwargs["payload"]["shop_id"] == "shop-no-photos"

    @pytest.mark.asyncio
    async def test_enrich_shop_enqueued_once_not_per_photo(self, mock_db, mock_llm, mock_queue):
        """ENRICH_SHOP is enqueued once at the end, not once per photo classified."""
        from models.types import JobType
        from workers.handlers.classify_shop_photos import handle_classify_shop_photos

        photos = [
            {
                "id": f"p{i}",
                "url": f"https://cdn/photo{i}.jpg",
                "uploaded_at": f"2025-06-0{i + 1}T00:00:00+00:00",
            }
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
            c
            for c in mock_queue.enqueue.call_args_list
            if c.kwargs.get("job_type") == JobType.ENRICH_SHOP
        ]
        assert len(enrich_enqueue_calls) == 1

    @pytest.mark.asyncio
    async def test_enqueues_enrich_menu_photo_when_menu_photos_exist(
        self, mock_db, mock_llm, mock_queue
    ):
        """Given photos classified as MENU, when handler completes, then ENRICH_MENU_PHOTO is enqueued with photo details."""
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "photo-1",
                    "url": "https://example.com/menu1.jpg",
                    "uploaded_at": "2026-04-01T00:00:00Z",
                },
                {
                    "id": "photo-2",
                    "url": "https://example.com/menu2.jpg",
                    "uploaded_at": "2026-04-01T00:00:00Z",
                },
            ]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )
        mock_llm.classify_photo = AsyncMock(side_effect=[PhotoCategory.MENU, PhotoCategory.MENU])
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "photo-1",
                    "url": "https://example.com/menu1.jpg",
                    "uploaded_at": "2026-04-01T00:00:00Z",
                },
                {
                    "id": "photo-2",
                    "url": "https://example.com/menu2.jpg",
                    "uploaded_at": "2026-04-01T00:00:00Z",
                },
            ]
        )
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": SHOP_ID}, db=mock_db, llm=mock_llm, queue=mock_queue
        )

        enqueue_calls = [
            c
            for c in mock_queue.enqueue.call_args_list
            if c.kwargs.get("job_type") == JobType.ENRICH_MENU_PHOTO
        ]
        assert len(enqueue_calls) == 1
        enqueue_payload = enqueue_calls[0].kwargs.get("payload")
        assert enqueue_payload["shop_id"] == SHOP_ID
        assert len(enqueue_payload["photos"]) == 2

    @pytest.mark.asyncio
    async def test_skips_enrich_menu_photo_when_no_menu_photos(self, mock_db, mock_llm, mock_queue):
        """Given no MENU photos classified, when handler completes, then ENRICH_MENU_PHOTO is NOT enqueued."""
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "p1",
                    "url": "https://example.com/vibe.jpg",
                    "uploaded_at": "2026-04-01T00:00:00Z",
                }
            ]
        )
        mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
            MagicMock()
        )
        mock_llm.classify_photo = AsyncMock(return_value=PhotoCategory.VIBE)
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        await handle_classify_shop_photos(
            payload={"shop_id": SHOP_ID}, db=mock_db, llm=mock_llm, queue=mock_queue
        )

        enqueue_calls = [
            c
            for c in mock_queue.enqueue.call_args_list
            if c.kwargs.get("job_type") == JobType.ENRICH_MENU_PHOTO
        ]
        assert len(enqueue_calls) == 0

    @pytest.mark.asyncio
    async def test_dedup_skips_already_extracted_photos(self, mock_db, mock_llm, mock_queue):
        """Given all MENU photos already extracted (extracted_at > uploaded_at), then ENRICH_MENU_PHOTO is NOT enqueued."""
        menu_photos = [
            {
                "id": "photo-1",
                "url": "https://example.com/menu1.jpg",
                "uploaded_at": "2026-04-01T00:00:00Z",
            }
        ]
        dedup_items = [{"source_photo_id": "photo-1", "extracted_at": "2026-04-10T00:00:00Z"}]

        # Use table-name-aware side_effect to return correct data per table
        shop_photos_table = MagicMock()
        shop_menu_items_table = MagicMock()

        # shop_photos: unclassified photos query (NULL category)
        shop_photos_table.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=menu_photos
        )
        # shop_photos: MENU photos query (after classification)
        shop_photos_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=menu_photos
        )
        # shop_photos: existing category counts query
        shop_photos_table.select.return_value.eq.return_value.not_.is_.return_value.neq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        shop_photos_table.update.return_value.in_.return_value.execute.return_value = MagicMock()

        # shop_menu_items: dedup query (source_photo_id, extracted_at)
        shop_menu_items_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=dedup_items
        )

        # shop_submissions: submission context query
        submissions_table = MagicMock()
        submissions_table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )

        def table_side_effect(name):
            if name == "shop_photos":
                return shop_photos_table
            if name == "shop_menu_items":
                return shop_menu_items_table
            return submissions_table

        mock_db.table.side_effect = table_side_effect
        mock_llm.classify_photo = AsyncMock(return_value=PhotoCategory.MENU)

        await handle_classify_shop_photos(
            payload={"shop_id": SHOP_ID}, db=mock_db, llm=mock_llm, queue=mock_queue
        )

        enqueue_calls = [
            c
            for c in mock_queue.enqueue.call_args_list
            if c.kwargs.get("job_type") == JobType.ENRICH_MENU_PHOTO
        ]
        assert len(enqueue_calls) == 0


@pytest.mark.asyncio
async def test_classify_shop_photos_writes_step_timings_to_db():
    shop_id = "shop-id-001"
    job_id = "job-id-001"

    mock_llm = AsyncMock()
    mock_llm.classify_photo.return_value = PhotoCategory.VIBE

    tables: dict = {}

    def table_router(name: str):
        if name not in tables:
            t = MagicMock()
            if name == "shop_photos":
                # unclassified photos fetch
                t.select.return_value.eq.return_value.is_.return_value.execute.return_value = (
                    MagicMock(
                        data=[
                            {
                                "id": "photo-1",
                                "url": "https://example.com/1.jpg",
                                "category": None,
                            }
                        ]
                    )
                )
                # existing counts fetch (no existing classified photos)
                t.select.return_value.eq.return_value.not_.return_value.is_.return_value.execute.return_value = MagicMock(
                    data=[]
                )
                # batch update
                t.update.return_value.in_.return_value.execute.return_value = MagicMock()
            elif name == "job_queue":
                t.update.return_value.eq.return_value.execute.return_value = MagicMock()
            tables[name] = t
        return tables[name]

    db = MagicMock()
    db.table.side_effect = table_router
    queue = AsyncMock()

    await handle_classify_shop_photos(
        payload={"shop_id": shop_id},
        db=db,
        llm=mock_llm,
        queue=queue,
        job_id=job_id,
    )

    assert "job_queue" in tables, "job_queue table was never accessed"
    update_calls = tables["job_queue"].update.call_args_list
    assert len(update_calls) == 1, "Expected exactly one job_queue update for step_timings"
    written = update_calls[0][0][0]
    assert "step_timings" in written
    timings = written["step_timings"]
    assert set(timings.keys()) == {"fetch_photos", "classify", "db_write"}
    for v in timings.values():
        assert isinstance(v["duration_ms"], int)
        assert v["duration_ms"] >= 0
