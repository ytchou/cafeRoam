"""Supabase/pgvector-backed semantic search cache adapter."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from supabase import Client


@dataclass
class CacheEntry:
    id: str
    query_hash: str
    query_text: str
    mode_filter: str | None
    query_embedding: list[float]
    results: list[dict[str, Any]]
    hit_count: int
    expires_at: str
    is_expired: bool


def _parse_entry(row: dict[str, Any]) -> CacheEntry:
    expires_str = row["expires_at"]
    try:
        expires_dt = datetime.fromisoformat(expires_str)
        is_expired = expires_dt < datetime.now(timezone.utc)
    except (ValueError, TypeError):
        is_expired = False
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
        now_iso = datetime.now(timezone.utc).isoformat()
        response = (
            self._db.table("search_cache")
            .select("*")
            .eq("query_hash", query_hash)
            .gt("expires_at", now_iso)
            .limit(1)
            .execute()
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
        response = self._db.rpc(
            "search_cache_similar",
            {
                "query_embedding": embedding,
                "similarity_threshold": threshold,
                "filter_mode": mode,
            },
        ).execute()
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
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self._ttl_seconds)
        self._db.table("search_cache").upsert(
            {
                "query_hash": query_hash,
                "query_text": query_text,
                "mode_filter": mode,
                "query_embedding": embedding,
                "results": results,
                "hit_count": 0,
                "expires_at": expires_at.isoformat(),
            },
            on_conflict="query_hash",
        ).execute()

    async def increment_hit(self, entry_id: str) -> None:
        self._db.rpc(
            "increment_search_cache_hit",
            {"entry_id": entry_id},
        ).execute()
