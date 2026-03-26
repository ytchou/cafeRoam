from typing import Any, Protocol


class CacheEntry:
    """Represents a cached search result row."""

    id: str
    query_hash: str
    query_text: str
    mode_filter: str | None
    query_embedding: list[float]
    results: list[dict[str, Any]]
    hit_count: int
    expires_at: str
    is_expired: bool


class SearchCacheProvider(Protocol):
    async def get_by_hash(self, query_hash: str) -> CacheEntry | None:
        """Tier 1: exact hash lookup."""
        ...

    async def find_similar(
        self,
        embedding: list[float],
        mode: str | None,
        threshold: float,
    ) -> CacheEntry | None:
        """Tier 2: semantic similarity lookup via cosine distance."""
        ...

    async def store(
        self,
        query_hash: str,
        query_text: str,
        mode: str | None,
        embedding: list[float],
        results: list[dict[str, Any]],
    ) -> None:
        """Store a new cache entry."""
        ...

    async def increment_hit(self, entry_id: str) -> None:
        """Increment hit_count for observability."""
        ...
