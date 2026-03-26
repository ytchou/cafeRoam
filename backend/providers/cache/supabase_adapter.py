"""Supabase/pgvector-backed semantic search cache adapter."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any, cast

from providers.cache.interface import CacheEntry

if TYPE_CHECKING:
    from supabase import Client

# Tier 1 lookups do not need the query_embedding vector (~6KB per row).
_CACHE_SELECT_COLS = "id, query_hash, query_text, mode_filter, results, hit_count, expires_at"


def _parse_entry(row: dict[str, Any]) -> CacheEntry:
    expires_str = row["expires_at"]
    try:
        expires_dt = datetime.fromisoformat(expires_str)
        is_expired = expires_dt < datetime.now(UTC)
    except (ValueError, TypeError):
        is_expired = True  # fail closed: treat unparseable timestamp as expired
    return CacheEntry(
        id=row["id"],
        query_hash=row["query_hash"],
        query_text=row["query_text"],
        mode_filter=row.get("mode_filter"),
        query_embedding=row.get("query_embedding", []),
        results=row.get("results", []),
        hit_count=row.get("hit_count", 0),
        expires_at=expires_str,
        is_expired=is_expired,
    )


class SupabaseSearchCacheAdapter:
    def __init__(self, db: Any, ttl_seconds: int = 14400):
        self._db: Client = db
        self._ttl_seconds = ttl_seconds

    async def get_by_hash(self, query_hash: str) -> CacheEntry | None:
        now_iso = datetime.now(UTC).isoformat()
        response = await asyncio.to_thread(
            lambda: (
                self._db.table("search_cache")
                .select(_CACHE_SELECT_COLS)
                .eq("query_hash", query_hash)
                .gt("expires_at", now_iso)
                .limit(1)
                .execute()
            )
        )
        rows = cast("list[dict[str, Any]]", response.data)
        if not rows:
            return None
        return _parse_entry(rows[0])

    async def find_similar(
        self,
        embedding: list[float],
        mode: str | None,
        threshold: float,
    ) -> CacheEntry | None:
        params = {
            "query_embedding": embedding,
            "similarity_threshold": threshold,
            "filter_mode": mode,
        }
        response = await asyncio.to_thread(
            lambda: self._db.rpc("search_cache_similar", params).execute()
        )
        rows = cast("list[dict[str, Any]]", response.data)
        if not rows:
            return None
        return _parse_entry(rows[0])

    async def store(
        self,
        query_hash: str,
        query_text: str,
        mode: str | None,
        embedding: list[float],
        results: list[dict[str, Any]],
    ) -> None:
        expires_at = datetime.now(UTC) + timedelta(seconds=self._ttl_seconds)
        payload = {
            "query_hash": query_hash,
            "query_text": query_text,
            "mode_filter": mode,
            "query_embedding": embedding,
            "results": results,
            "expires_at": expires_at.isoformat(),
            # hit_count omitted: DB DEFAULT 0 handles new rows;
            # existing rows on conflict retain their accumulated count.
        }
        await asyncio.to_thread(
            lambda: (
                self._db.table("search_cache").upsert(payload, on_conflict="query_hash").execute()
            )
        )

    async def increment_hit(self, entry_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.rpc(
                "increment_search_cache_hit",
                {"entry_id": entry_id},
            ).execute()
        )
