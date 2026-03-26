from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from providers.cache.supabase_adapter import SupabaseSearchCacheAdapter


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def adapter(mock_db):
    return SupabaseSearchCacheAdapter(db=mock_db, ttl_seconds=14400)


class TestGetByHash:
    async def test_returns_none_on_cache_miss(self, adapter, mock_db):
        """When no entry matches the hash, the user gets a fresh search."""
        mock_db.table.return_value.select.return_value.eq.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        result = await adapter.get_by_hash("abc123hash")
        assert result is None

    async def test_returns_entry_on_cache_hit(self, adapter, mock_db):
        """When an identical query was cached, the user gets instant results."""
        future_ts = "2099-01-01T00:00:00+00:00"
        mock_db.table.return_value.select.return_value.eq.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "entry-1",
                    "query_hash": "abc123hash",
                    "query_text": "good coffee",
                    "mode_filter": None,
                    "query_embedding": [0.1] * 10,
                    "results": [{"shop": {"name": "TestShop"}}],
                    "hit_count": 3,
                    "expires_at": future_ts,
                }
            ]
        )
        result = await adapter.get_by_hash("abc123hash")
        assert result is not None
        assert result.query_hash == "abc123hash"
        assert result.hit_count == 3
        assert result.is_expired is False


class TestFindSimilar:
    async def test_returns_none_when_no_similar_entry(self, adapter, mock_db):
        """When no semantically similar query exists, the user gets a fresh search."""
        mock_db.rpc.return_value.execute.return_value = MagicMock(data=[])
        result = await adapter.find_similar([0.1] * 1536, None, threshold=0.85)
        assert result is None

    async def test_returns_entry_when_similar_above_threshold(self, adapter, mock_db):
        """When a similar query exists (cosine >= 0.85), the user gets cached results."""
        future_ts = "2099-01-01T00:00:00+00:00"
        mock_db.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "entry-2",
                    "query_hash": "def456hash",
                    "query_text": "nice coffee",
                    "mode_filter": None,
                    "query_embedding": [0.1] * 10,
                    "results": [{"shop": {"name": "SimilarShop"}}],
                    "hit_count": 1,
                    "expires_at": future_ts,
                    "similarity": 0.92,
                }
            ]
        )
        result = await adapter.find_similar([0.1] * 1536, None, threshold=0.85)
        assert result is not None
        assert result.query_text == "nice coffee"

    async def test_filters_by_mode(self, adapter, mock_db):
        """Cache entries are isolated by mode — work results don't leak into rest searches."""
        mock_db.rpc.return_value.execute.return_value = MagicMock(data=[])
        await adapter.find_similar([0.1] * 1536, "work", threshold=0.85)
        call_args = mock_db.rpc.call_args
        params = call_args[0][1]
        assert params["filter_mode"] == "work"


class TestStore:
    async def test_stores_entry_with_correct_ttl(self, adapter, mock_db):
        """When a search result is cached, it expires after the configured TTL."""
        mock_db.table.return_value.upsert.return_value.execute = MagicMock()
        await adapter.store(
            query_hash="abc123",
            query_text="good coffee",
            mode=None,
            embedding=[0.1] * 1536,
            results=[{"shop": {"name": "TestShop"}}],
        )
        upsert_call = mock_db.table.return_value.upsert.call_args
        row = upsert_call[0][0]
        assert row["query_hash"] == "abc123"
        assert row["query_text"] == "good coffee"
        assert "expires_at" in row


class TestIncrementHit:
    async def test_increments_hit_count(self, adapter, mock_db):
        """Cache hit count is tracked for observability."""
        mock_db.rpc.return_value.execute = MagicMock()
        await adapter.increment_hit("entry-1")
        mock_db.rpc.assert_called()
