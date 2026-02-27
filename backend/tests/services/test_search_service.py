from unittest.mock import AsyncMock, MagicMock

import pytest

import services.search_service as _ss_module
from models.types import SearchFilters, SearchQuery
from services.search_service import SearchService
from tests.factories import make_shop_row


@pytest.fixture(autouse=True)
def reset_idf_cache():
    """Reset module-level IDF cache between tests for isolation."""
    _ss_module._IDF_CACHE = None
    _ss_module._IDF_CACHE_AT = 0.0
    yield
    _ss_module._IDF_CACHE = None
    _ss_module._IDF_CACHE_AT = 0.0


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
    async def test_search_embeds_query_text(self, search_service, mock_embeddings, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        query = SearchQuery(text="good wifi for working")
        await search_service.search(query)
        mock_embeddings.embed.assert_called_once_with("good wifi for working")

    async def test_search_returns_ranked_results(self, search_service, mock_supabase):
        shop_data = make_shop_row()
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[shop_data])))
        )
        query = SearchQuery(text="good wifi")
        results = await search_service.search(query)
        assert len(results) == 1
        assert results[0].similarity_score == 0.85

    async def test_search_respects_limit(self, search_service, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        query = SearchQuery(text="test", limit=5)
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
        results = await search_service.search(query)
        assert len(results) == 2
        assert results[0].shop.id == "shop-high"
        assert results[1].shop.id == "shop-low"

    async def test_search_default_limit_is_20(self, search_service, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        query = SearchQuery(text="test")
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
        results = await search_service.search(query)
        assert results[0].taxonomy_boost == 0.0
        assert results[0].taxonomy_boost == 0.0
        assert results[0].total_score == pytest.approx(results[0].similarity_score * 0.7, rel=1e-4)


_SEARCH_SHOP_ROW = make_shop_row(tag_ids=["quiet", "wifi-reliable"])


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
    results = await service.search(query)

    assert len(results) > 0
    # Taxonomy boost should be > 0 when tags match
    assert results[0].taxonomy_boost > 0.0
    # total_score should be weighted combination
    assert results[0].total_score == pytest.approx(
        results[0].similarity_score * 0.7 + results[0].taxonomy_boost * 0.3,
        rel=1e-4,
    )
