from unittest.mock import AsyncMock, MagicMock

import pytest
from structlog.testing import capture_logs

import services.search_service as _ss_module
from models.types import SearchFilters, SearchQuery
from services.search_service import SearchService
from tests.factories import make_shop_row


@pytest.fixture(autouse=True)
def reset_idf_cache():
    """Reset module-level IDF cache between tests for isolation."""
    _ss_module.SearchService._clear_idf_cache()
    yield
    _ss_module.SearchService._clear_idf_cache()


@pytest.fixture
def mock_embeddings():
    provider = AsyncMock()
    provider.embed = AsyncMock(return_value=[0.1] * 1536)
    provider.dimensions = 1536
    return provider


@pytest.fixture
def search_service(mock_supabase, mock_embeddings):
    return SearchService(db=mock_supabase, embeddings=mock_embeddings)


class TestSearchService:
    async def test_search_embeds_normalized_query_text(
        self, search_service, mock_embeddings, mock_supabase
    ):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        query = SearchQuery(text="Good WiFi for Working!")
        await search_service.search(query)
        mock_embeddings.embed.assert_called_once_with("good wifi for working")

    async def test_search_returns_ranked_results(self, search_service, mock_supabase):
        shop_data = make_shop_row()
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[shop_data])))
        )
        query = SearchQuery(text="good wifi")
        response = await search_service.search(query)
        assert len(response.results) == 1
        assert response.results[0].similarity_score == 0.85

    async def test_search_respects_limit(self, search_service, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        query = SearchQuery(text="靜謐工作空間", limit=5)
        await search_service.search(query)
        call_args = mock_supabase.rpc.call_args
        assert call_args is not None

    async def test_search_with_geo_filter(self, search_service, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        filters = SearchFilters(near_latitude=25.033, near_longitude=121.565, radius_km=3.0)
        query = SearchQuery(text="quiet cafe", filters=filters)
        await search_service.search(query)
        call_args = mock_supabase.rpc.call_args
        assert call_args is not None
        params = call_args[1] if call_args[1] else call_args[0][1]
        assert params["filter_lat"] == 25.033
        assert params["filter_lng"] == 121.565
        assert params["filter_radius_km"] == 3.0

    async def test_search_sorts_by_total_score(self, search_service, mock_supabase):
        shop_low = make_shop_row(id="shop-low", name="Low Score")
        shop_low["similarity"] = 0.5
        shop_high = make_shop_row(id="shop-high", name="High Score")
        shop_high["similarity"] = 0.95
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[shop_low, shop_high]))
            )
        )
        query = SearchQuery(text="best coffee")
        response = await search_service.search(query)
        assert len(response.results) == 2
        assert response.results[0].shop.id == "shop-high"
        assert response.results[1].shop.id == "shop-low"

    async def test_search_default_limit_is_20(self, search_service, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        query = SearchQuery(text="濃縮咖啡")
        await search_service.search(query)
        call_args = mock_supabase.rpc.call_args
        params = call_args[1] if call_args[1] else call_args[0][1]
        assert params["match_count"] == 20

    async def test_taxonomy_boost_zero_without_filters(self, search_service, mock_supabase):
        shop_data = make_shop_row()
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[shop_data])))
        )
        query = SearchQuery(text="coffee")
        response = await search_service.search(query)
        assert response.results[0].taxonomy_boost == 0.0
        assert response.results[0].total_score == pytest.approx(
            response.results[0].similarity_score * 0.7, rel=1e-4
        )


@pytest.mark.asyncio
async def test_search_results_include_hydrated_taxonomy_tags(mock_embeddings):
    """When a user searches and applies a WiFi filter, results should carry taxonomy tags for client-side filtering."""
    db = MagicMock()

    shop_data = make_shop_row(tag_ids=["wifi_available", "quiet"])

    def _rpc_side_effect(name, params):
        m = MagicMock()
        if name == "search_shops":
            m.execute.return_value = MagicMock(data=[shop_data])
        else:
            m.execute.return_value = MagicMock(data=[])
        return m

    db.rpc.side_effect = _rpc_side_effect
    db.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "wifi_available",
                "dimension": "functionality",
                "label": "WiFi Available",
                "label_zh": "提供WiFi",
            },
            {"id": "quiet", "dimension": "ambience", "label": "Quiet", "label_zh": "安靜"},
        ]
    )

    service = SearchService(db=db, embeddings=mock_embeddings)
    query = SearchQuery(text="wifi cafe")
    response = await service.search(query)

    assert len(response.results) == 1
    shop = response.results[0].shop
    assert len(shop.taxonomy_tags) == 2
    tag_ids = {t.id for t in shop.taxonomy_tags}
    assert "wifi_available" in tag_ids
    assert "quiet" in tag_ids


_SEARCH_SHOP_ROW = make_shop_row()


@pytest.fixture
def mock_db_with_idf():
    db = MagicMock()

    # Route two different RPCs to different return values
    def _rpc_side_effect(name: str, params: dict):
        m = MagicMock()
        if name == "search_shops":
            m.execute.return_value = MagicMock(data=[_SEARCH_SHOP_ROW])
        elif name == "shop_tag_counts":
            m.execute.return_value = MagicMock(
                data=[
                    {"tag_id": "quiet", "shop_count": 5},
                    {"tag_id": "wifi-reliable", "shop_count": 3},
                ]
            )
        else:
            m.execute.return_value = MagicMock(data=[])
        return m

    db.rpc.side_effect = _rpc_side_effect
    # Shop count query: table("shops").select(...).eq(...).execute().count
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        count=50
    )
    return db


@pytest.mark.asyncio
async def test_search_with_mode_filter(mock_supabase, mock_embeddings):
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])
    service = SearchService(db=mock_supabase, embeddings=mock_embeddings)
    query = SearchQuery(text="quiet wifi", limit=10)
    await service.search(query, mode="work", mode_threshold=0.4)

    # Should call RPC with mode filter params
    mock_supabase.rpc.assert_called_once()
    call_args = mock_supabase.rpc.call_args
    assert call_args[0][0] == "search_shops"
    params = call_args[0][1]
    assert "filter_mode_field" in params
    assert params["filter_mode_field"] == "mode_work"


@pytest.mark.asyncio
async def test_taxonomy_boost_increases_score(mock_db_with_idf, mock_embeddings):
    service = SearchService(db=mock_db_with_idf, embeddings=mock_embeddings)
    query = SearchQuery(
        text="quiet place",
        filters=SearchFilters(dimensions={"ambience": ["quiet"]}),
        limit=10,
    )
    response = await service.search(query)

    assert len(response.results) > 0
    # Taxonomy boost should be > 0 when tags match
    assert response.results[0].taxonomy_boost > 0.0
    # total_score should be weighted combination
    assert response.results[0].total_score == pytest.approx(
        response.results[0].similarity_score * 0.7 + response.results[0].taxonomy_boost * 0.3,
        rel=1e-4,
    )


class TestSearchCacheIntegration:
    """Cache integration with the search pipeline."""

    @pytest.fixture
    def mock_cache(self):
        cache = AsyncMock()
        cache.get_by_hash = AsyncMock(return_value=None)
        cache.find_similar = AsyncMock(return_value=None)
        cache.store = AsyncMock()
        cache.increment_hit = AsyncMock()
        return cache

    @pytest.fixture
    def mock_embeddings(self):
        emb = AsyncMock()
        emb.embed = AsyncMock(return_value=[0.1] * 1536)
        emb.dimensions = 1536
        return emb

    async def test_tier1_exact_hit_skips_embedding_and_search(
        self, mock_supabase, mock_embeddings, mock_cache
    ):
        """When a user repeats the exact same search, no OpenAI call or DB query happens."""
        cached_entry = MagicMock()
        cached_entry.is_expired = False
        cached_entry.id = "entry-1"
        cached_entry.results = [
            {
                "shop": {"name": "芒果咖啡工坊"},
                "similarityScore": 0.9,
                "taxonomyBoost": 0.0,
                "totalScore": 0.63,
            }
        ]
        mock_cache.get_by_hash = AsyncMock(return_value=cached_entry)

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=mock_cache)
        query = SearchQuery(text="good wifi coffee")
        response = await service.search(query)

        mock_embeddings.embed.assert_not_called()
        mock_supabase.rpc.assert_not_called()
        mock_cache.increment_hit.assert_called_once_with("entry-1")
        assert response.results == cached_entry.results
        assert response.cache_hit is True

    async def test_tier2_semantic_hit_skips_full_search(
        self, mock_supabase, mock_embeddings, mock_cache
    ):
        """When a semantically similar query was cached, pgvector search is skipped."""
        mock_cache.get_by_hash = AsyncMock(return_value=None)
        similar_entry = MagicMock()
        similar_entry.is_expired = False
        similar_entry.id = "entry-2"
        similar_entry.results = [
            {
                "shop": {"name": "靜巷咖啡"},
                "similarityScore": 0.88,
                "taxonomyBoost": 0.0,
                "totalScore": 0.62,
            }
        ]
        mock_cache.find_similar = AsyncMock(return_value=similar_entry)

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=mock_cache)
        query = SearchQuery(text="nice wifi café")
        response = await service.search(query)

        mock_embeddings.embed.assert_called_once()
        mock_supabase.rpc.assert_not_called()
        mock_cache.increment_hit.assert_called_once_with("entry-2")
        assert response.results == similar_entry.results
        assert response.cache_hit is True

    async def test_full_miss_runs_pipeline_and_caches_result(
        self, mock_supabase, mock_embeddings, mock_cache
    ):
        """When no cache entry matches, the full search runs and the result is cached."""
        shop_data = make_shop_row()
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[shop_data])))
        )

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=mock_cache)
        query = SearchQuery(text="unique rare query")
        response = await service.search(query)

        assert len(response.results) == 1
        assert response.cache_hit is False
        mock_cache.store.assert_called_once()

    async def test_cache_is_optional_none_skips_all_cache_logic(
        self, mock_supabase, mock_embeddings
    ):
        """When no cache provider is supplied, search works exactly as before."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=None)
        query = SearchQuery(text="貓咪咖啡館")
        response = await service.search(query)
        assert response.results == []
        assert response.cache_hit is False


class TestSearchCacheObservability:
    """Verify structured log events are emitted on cache outcomes."""

    @pytest.fixture
    def mock_cache(self):
        cache = AsyncMock()
        cache.get_by_hash = AsyncMock(return_value=None)
        cache.find_similar = AsyncMock(return_value=None)
        cache.store = AsyncMock()
        cache.increment_hit = AsyncMock()
        return cache

    @pytest.fixture
    def mock_embeddings(self):
        emb = AsyncMock()
        emb.embed = AsyncMock(return_value=[0.1] * 1536)
        emb.dimensions = 1536
        return emb

    async def test_tier1_exact_hit_emits_log_event(
        self, mock_supabase, mock_embeddings, mock_cache
    ):
        """When a Tier 1 exact cache hit occurs, a Search cache hit log event is emitted."""
        cached_entry = MagicMock()
        cached_entry.is_expired = False
        cached_entry.id = "entry-log-1"
        cached_entry.results = []
        mock_cache.get_by_hash = AsyncMock(return_value=cached_entry)

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=mock_cache)
        with capture_logs() as logs:
            await service.search(SearchQuery(text="好的WiFi咖啡廳"), mode="work")

        assert len(logs) == 1
        assert logs[0]["event"] == "Search cache hit"
        assert logs[0]["cache_hit"] is True
        assert logs[0]["cache_tier"] == "exact"
        assert logs[0]["mode"] == "work"
        assert len(logs[0]["query_hash"]) == 8

    async def test_tier2_semantic_hit_emits_log_event(
        self, mock_supabase, mock_embeddings, mock_cache
    ):
        """When a Tier 2 semantic cache hit occurs, a Search cache hit log event is emitted."""
        mock_cache.get_by_hash = AsyncMock(return_value=None)
        similar_entry = MagicMock()
        similar_entry.is_expired = False
        similar_entry.id = "entry-log-2"
        similar_entry.results = []
        mock_cache.find_similar = AsyncMock(return_value=similar_entry)

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=mock_cache)
        with capture_logs() as logs:
            await service.search(SearchQuery(text="安靜的咖啡廳"), mode="rest")

        assert len(logs) == 1
        assert logs[0]["event"] == "Search cache hit"
        assert logs[0]["cache_hit"] is True
        assert logs[0]["cache_tier"] == "semantic"
        assert logs[0]["mode"] == "rest"

    async def test_full_miss_emits_log_event(self, mock_supabase, mock_embeddings, mock_cache):
        """When a full cache miss occurs, a Search cache miss log event is emitted."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=mock_cache)
        with capture_logs() as logs:
            await service.search(SearchQuery(text="獨特稀有的咖啡"))

        assert len(logs) == 1
        assert logs[0]["event"] == "Search cache miss"
        assert logs[0]["cache_hit"] is False
        assert logs[0]["cache_tier"] == "miss"

    async def test_no_cache_emits_no_log_event(self, mock_supabase, mock_embeddings):
        """When no cache provider is configured, no cache log event is emitted."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )

        service = SearchService(db=mock_supabase, embeddings=mock_embeddings, cache=None)
        with capture_logs() as logs:
            await service.search(SearchQuery(text="無快取搜尋"))

        assert logs == []


class TestOptionCPlusScoring:
    """Integration tests for query-type-aware scoring branches in search pipeline."""

    @pytest.fixture
    def mock_embeddings(self):
        emb = AsyncMock()
        emb.embed = AsyncMock(return_value=[0.1] * 1536)
        emb.dimensions = 1536
        return emb

    def _make_rpc_db(self, rows):
        db = MagicMock()
        db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=rows)))
        )
        return db

    async def test_item_specific_query_uses_keyword_weights(self, mock_embeddings):
        """When query_type is item_specific, scoring uses 0.5/0.2/0.3 weights."""
        row = make_shop_row(
            similarity=0.8,
            menu_highlights=["巴斯克蛋糕"],
            coffee_origins=[],
        )
        db = self._make_rpc_db([row])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="巴斯克蛋糕")
        response = await service.search(query, query_type="item_specific")

        result = response.results[0]
        # keyword_score = 1.0 (exact match), taxonomy_boost = 0.0 (no filters)
        expected = 0.8 * 0.5 + 0.0 * 0.2 + 1.0 * 0.3
        assert result.total_score == pytest.approx(expected, rel=1e-4)

    async def test_specialty_coffee_query_uses_keyword_weights(self, mock_embeddings):
        """When query_type is specialty_coffee, scoring uses 0.5/0.2/0.3 weights."""
        row = make_shop_row(
            similarity=0.75,
            menu_highlights=[],
            coffee_origins=["耶加雪菲"],
        )
        db = self._make_rpc_db([row])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="耶加雪菲")
        response = await service.search(query, query_type="specialty_coffee")

        result = response.results[0]
        expected = 0.75 * 0.5 + 0.0 * 0.2 + 1.0 * 0.3
        assert result.total_score == pytest.approx(expected, rel=1e-4)

    async def test_generic_query_uses_original_weights(self, mock_embeddings):
        """When query_type is generic, scoring uses the original 0.7/0.3 formula."""
        row = make_shop_row(similarity=0.85, menu_highlights=["巴斯克蛋糕"])
        db = self._make_rpc_db([row])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="安靜適合工作")
        response = await service.search(query, query_type="generic")

        result = response.results[0]
        expected = 0.85 * 0.7 + 0.0 * 0.3
        assert result.total_score == pytest.approx(expected, rel=1e-4)

    async def test_keyword_match_reranks_results(self, mock_embeddings):
        """A shop with lower similarity but keyword match should rank above a high-similarity shop without match."""
        shop_with_item = make_shop_row(
            id="shop-with-item",
            name="蛋糕名店",
            similarity=0.6,
            menu_highlights=["巴斯克蛋糕"],
        )
        shop_without_item = make_shop_row(
            id="shop-without",
            name="一般咖啡店",
            similarity=0.9,
            menu_highlights=[],
            coffee_origins=[],
            description="安靜適合工作的獨立咖啡店",
        )
        db = self._make_rpc_db([shop_without_item, shop_with_item])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="巴斯克蛋糕")
        response = await service.search(query, query_type="item_specific")

        # shop_with_item: 0.6*0.5 + 0*0.2 + 1.0*0.3 = 0.60
        # shop_without:   0.9*0.5 + 0*0.2 + 0.0*0.3 = 0.45
        assert response.results[0].shop.id == "shop-with-item"
        assert response.results[1].shop.id == "shop-without"

    async def test_description_fallback_scores_lower_than_structured_match(self, mock_embeddings):
        """A shop where the query only appears in description scores 0.5 keyword, lower than structured match."""
        shop_desc_only = make_shop_row(
            id="shop-desc",
            similarity=0.8,
            menu_highlights=[],
            coffee_origins=[],
            description="提供精品手沖與巴斯克蛋糕",
        )
        shop_highlights = make_shop_row(
            id="shop-highlights",
            similarity=0.8,
            menu_highlights=["巴斯克蛋糕"],
            coffee_origins=[],
        )
        db = self._make_rpc_db([shop_desc_only, shop_highlights])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="巴斯克蛋糕")
        response = await service.search(query, query_type="item_specific")

        # shop_highlights: 0.8*0.5 + 0*0.2 + 1.0*0.3 = 0.70
        # shop_desc_only:  0.8*0.5 + 0*0.2 + 0.5*0.3 = 0.55
        assert response.results[0].shop.id == "shop-highlights"
        assert response.results[1].shop.id == "shop-desc"

    async def test_shop_with_null_highlights_does_not_crash(self, mock_embeddings):
        """When menu_highlights or coffee_origins is None from DB, search completes without error."""
        row = make_shop_row(
            id="shop-nullfields",
            similarity=0.7,
            menu_highlights=None,
            coffee_origins=None,
            description=None,
        )
        db = self._make_rpc_db([row])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="耶加雪菲")
        response = await service.search(query, query_type="specialty_coffee")

        # keyword_score = 0.0 (no fields to match), total = 0.7*0.5 + 0*0.2 + 0*0.3 = 0.35
        assert len(response.results) == 1
        assert response.results[0].total_score == pytest.approx(0.7 * 0.5, rel=1e-4)

    async def test_fullwidth_query_normalizes_before_keyword_match(self, mock_embeddings):
        """Full-width input '巴斯克蛋糕？' normalizes to '巴斯克蛋糕' and matches menu_highlights."""
        row = make_shop_row(
            id="shop-fw",
            similarity=0.8,
            menu_highlights=["巴斯克蛋糕"],
            coffee_origins=[],
        )
        db = self._make_rpc_db([row])
        service = SearchService(db=db, embeddings=mock_embeddings)
        query = SearchQuery(text="巴斯克蛋糕？")  # full-width question mark
        response = await service.search(query, query_type="item_specific")

        # Normalization strips trailing ？, exact match → keyword_score 1.0
        expected = 0.8 * 0.5 + 0.0 * 0.2 + 1.0 * 0.3
        assert response.results[0].total_score == pytest.approx(expected, rel=1e-4)
