"""Null adapter — cache is disabled. Always returns None (miss)."""

from typing import Any


class NullSearchCacheAdapter:
    async def get_by_hash(self, query_hash: str) -> None:
        return None

    async def find_similar(
        self,
        embedding: list[float],
        mode: str | None,
        threshold: float,
    ) -> None:
        return None

    async def store(
        self,
        query_hash: str,
        query_text: str,
        mode: str | None,
        embedding: list[float],
        results: list[dict[str, Any]],
    ) -> None:
        pass

    async def increment_hit(self, entry_id: str) -> None:
        pass
