import math
import time
from dataclasses import dataclass
from typing import Any, cast

import structlog
from pydantic import BaseModel
from supabase import Client

from core.config import settings
from core.opening_hours import parse_to_structured
from models.types import SearchQuery, SearchResult, Shop, TaxonomyTag
from providers.cache.interface import SearchCacheProvider
from providers.embeddings.interface import EmbeddingsProvider
from services.query_normalizer import hash_cache_key, normalize_query


@dataclass
class SearchResponse:
    """Return value from SearchService.search() — carries results and cache provenance."""

    results: list[Any]
    cache_hit: bool


class SuggestTag(BaseModel):
    id: str
    label: str


class SuggestResponse(BaseModel):
    completions: list[str]
    tags: list[SuggestTag]


logger = structlog.get_logger()

_SHOP_FIELDS_HANDLED_SEPARATELY = {
    "photo_urls",
    "taxonomy_tags",
    "mode_scores",
    "menu_highlights",
    "coffee_origins",
    "opening_hours",
}

# Module-level IDF cache — shared across all SearchService instances.
# SearchService is instantiated per-request, so an instance-level cache never
# survives between requests.  A 1-hour TTL is sufficient since tag distribution
# only changes when new shops reach 'live' status.
_IDF_CACHE: dict[str, float] | None = None
_IDF_CACHE_AT: float = 0.0
_IDF_TTL = 3600.0  # seconds

_CURATED_COMPLETIONS: list[str] = [
    "安靜可以工作",
    "有插座",
    "寵物友善",
    "不限時",
    "有WiFi",
    "氣氛好",
    "平價",
    "巴斯克蛋糕",
    "單品咖啡",
    "戶外座位",
]


class SearchService:
    def __init__(
        self,
        db: Client,
        embeddings: EmbeddingsProvider | None = None,
        cache: SearchCacheProvider | None = None,
    ):
        self._db = db
        self._embeddings = embeddings
        self._cache = cache

    async def search(
        self,
        query: SearchQuery,
        mode: str | None = None,
        mode_threshold: float = 0.4,
        query_type: str = "generic",
    ) -> SearchResponse:
        normalized = normalize_query(query.text)
        cache_key = hash_cache_key(normalized, mode, query_type)

        # Tier 1: exact text match
        if self._cache is not None:
            cached = await self._cache.get_by_hash(cache_key)
            if cached and not cached.is_expired:
                await self._cache.increment_hit(cached.id)
                logger.info(
                    "Search cache hit",
                    cache_hit=True,
                    cache_tier="exact",
                    query_hash=cache_key[:8],
                    mode=mode,
                )
                return SearchResponse(results=cached.results, cache_hit=True)

        # Generate embedding (needed for Tier 2 + full search)
        embeddings = self._embeddings
        if embeddings is None:
            raise ValueError("Embeddings provider is required for semantic search")
        query_embedding = await embeddings.embed(normalized)

        # Tier 2: semantic similarity
        if self._cache is not None:
            threshold = settings.search_cache_similarity_threshold
            similar = await self._cache.find_similar(query_embedding, mode, threshold)
            if similar and not similar.is_expired:
                await self._cache.increment_hit(similar.id)
                logger.info(
                    "Search cache hit",
                    cache_hit=True,
                    cache_tier="semantic",
                    query_hash=cache_key[:8],
                    mode=mode,
                )
                return SearchResponse(results=similar.results, cache_hit=True)

        # Full search pipeline
        results = await self._full_search(query_embedding, query, mode, mode_threshold, query_type)

        # Cache the result
        if self._cache is not None:
            serialized = [r.model_dump(by_alias=True, mode="json") for r in results]
            await self._cache.store(cache_key, normalized, mode, query_embedding, serialized)
            logger.info(
                "Search cache miss",
                cache_hit=False,
                cache_tier="miss",
                query_hash=cache_key[:8],
                mode=mode,
            )

        return SearchResponse(results=results, cache_hit=False)

    async def _full_search(
        self,
        query_embedding: list[float],
        query: SearchQuery,
        mode: str | None,
        mode_threshold: float,
        query_type: str = "generic",
    ) -> list[SearchResult]:
        """Run the full pgvector search + taxonomy boost pipeline."""
        limit = query.limit or 20
        rpc_params: dict[str, Any] = {
            "query_embedding": query_embedding,
            "match_count": limit,
        }

        if mode and mode in ("work", "rest", "social"):
            rpc_params["filter_mode_field"] = f"mode_{mode}"
            rpc_params["filter_mode_threshold"] = mode_threshold

        if query.filters and query.filters.near_latitude and query.filters.near_longitude:
            rpc_params["filter_lat"] = query.filters.near_latitude
            rpc_params["filter_lng"] = query.filters.near_longitude
            rpc_params["filter_radius_km"] = query.filters.radius_km or 5.0

        response = self._db.rpc("search_shops", rpc_params).execute()
        rows = cast("list[dict[str, Any]]", response.data)

        if query.filters and query.filters.dimensions:
            await self._load_idf_cache()

        # Hydrate taxonomy tags: collect all tag_ids, query once, build lookup
        all_tag_ids: set[str] = set()
        for row in rows:
            all_tag_ids.update(row.get("tag_ids") or [])
        tag_lookup = self._fetch_taxonomy_tags(all_tag_ids) if all_tag_ids else {}

        use_keyword_scoring = query_type in ("item_specific", "specialty_coffee")
        normalized_query = normalize_query(query.text)

        results: list[SearchResult] = []
        for row in rows:
            similarity = row.get("similarity", 0.0)
            taxonomy_boost = self._compute_taxonomy_boost(row, query)

            row_tag_ids = row.get("tag_ids") or []
            hydrated_tags = [tag_lookup[tid] for tid in row_tag_ids if tid in tag_lookup]

            eligible_keys = Shop.model_fields.keys() - _SHOP_FIELDS_HANDLED_SEPARATELY
            raw_hours = row.get("opening_hours") or []
            first_hour = next(iter(raw_hours), None)
            if first_hour is not None and isinstance(first_hour, str):
                structured = parse_to_structured(raw_hours)
                if not structured:
                    logger.warning(
                        "Search: legacy opening_hours present but none parseable",
                        shop_id=row.get("id"),
                    )
                coerced_hours: list[dict[str, int | None]] | None = [
                    h.model_dump() for h in structured
                ] or None
            else:
                coerced_hours = raw_hours or None
            shop = Shop(
                taxonomy_tags=hydrated_tags,
                photo_urls=row.get("photo_urls", []),
                menu_highlights=row.get("menu_highlights") or [],
                coffee_origins=row.get("coffee_origins") or [],
                opening_hours=coerced_hours,
                **{k: v for k, v in row.items() if k in eligible_keys},
            )

            if use_keyword_scoring:
                keyword_score = self._compute_keyword_score(row, normalized_query)
                total = similarity * 0.3 + taxonomy_boost * 0.2 + keyword_score * 0.5
            else:
                keyword_score = 0.0
                total = similarity * 0.7 + taxonomy_boost * 0.3

            results.append(
                SearchResult(
                    shop=shop,
                    similarity_score=similarity,
                    taxonomy_boost=taxonomy_boost,
                    total_score=total,
                )
            )

        results.sort(key=lambda r: r.total_score, reverse=True)
        return results

    @staticmethod
    def _clear_idf_cache() -> None:
        """Reset module-level IDF cache. For test isolation only."""
        global _IDF_CACHE, _IDF_CACHE_AT
        _IDF_CACHE = None
        _IDF_CACHE_AT = 0.0

    async def _load_idf_cache(self) -> None:
        """Load IDF scores from shop_tags via RPC, caching at module level."""
        global _IDF_CACHE, _IDF_CACHE_AT
        now = time.monotonic()
        if _IDF_CACHE is not None and now - _IDF_CACHE_AT < _IDF_TTL:
            return

        # Get actual shop count for accurate IDF denominator
        count_response = (
            self._db.table("shops")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("processing_status", "live")
            .execute()
        )
        total_shops = max(count_response.count or 1, 1)

        # Use RPC — PostgREST .select() cannot perform GROUP BY aggregations
        response = self._db.rpc("shop_tag_counts", {}).execute()
        rows = cast("list[dict[str, Any]]", response.data)

        cache: dict[str, float] = {}
        for row in rows:
            tag_id = row.get("tag_id", "")
            if not tag_id:
                continue
            doc_freq = max(int(row.get("shop_count", 1)), 1)
            # IDF: rarer tags score higher
            cache[tag_id] = math.log(total_shops / doc_freq)

        _IDF_CACHE = cache
        _IDF_CACHE_AT = now

    def _fetch_taxonomy_tags(self, tag_ids: set[str]) -> dict[str, TaxonomyTag]:
        """Query taxonomy_tags table once and return a lookup by tag ID."""
        response = (
            self._db.table("taxonomy_tags")
            .select("id, dimension, label, label_zh")
            .in_("id", list(tag_ids))
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        return {
            row["id"]: TaxonomyTag(
                id=row["id"],
                dimension=row["dimension"],
                label=row["label"],
                label_zh=row["label_zh"],
            )
            for row in rows
        }

    def _compute_taxonomy_boost(self, row: dict[str, Any], query: SearchQuery) -> float:
        """Compute taxonomy boost based on IDF-weighted tag overlap."""
        if not query.filters or not query.filters.dimensions:
            return 0.0

        shop_tags = row.get("tag_ids", [])
        if not shop_tags:
            return 0.0

        # Flatten query dimension values into a set of desired tags
        query_tags: set[str] = set()
        for dim_tags in query.filters.dimensions.values():
            query_tags.update(dim_tags)

        if not query_tags:
            return 0.0

        matching = [t for t in shop_tags if t in query_tags]
        if not matching:
            return 0.0

        if _IDF_CACHE:
            idf_sum = sum(_IDF_CACHE.get(t, 1.0) for t in matching)
            return idf_sum / max(len(shop_tags), 1)

        return len(matching) / max(len(shop_tags), 1)

    def _compute_keyword_score(self, row: dict[str, Any], normalized: str) -> float:
        """Score keyword match in menu_highlights, coffee_origins, or description.

        Args:
            normalized: Pre-normalized query string (output of normalize_query).
        """
        if not normalized:
            return 0.0

        highlights = [h.lower() for h in row.get("menu_highlights", []) or []]
        origins = [o.lower() for o in row.get("coffee_origins", []) or []]
        searchable = highlights + origins

        # Exact match in structured fields → highest signal
        if normalized in searchable:
            return 1.0

        # Substring match in structured fields
        if any(normalized in item for item in searchable):
            return 0.8

        # Fallback: substring match in description
        desc = (row.get("description") or "").lower()
        if normalized in desc:
            return 0.5

        return 0.0

    async def suggest(self, q: str) -> SuggestResponse:
        """Return autocomplete completions and matching taxonomy tags for query prefix q."""
        if not q:
            return SuggestResponse(completions=[], tags=[])

        completions = [c for c in _CURATED_COMPLETIONS if q in c][:5]

        q_escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        rows: list[dict[str, Any]] = cast(
            "list[dict[str, Any]]",
            self._db.table("taxonomy_tags")
            .select("id, label_zh")
            .ilike("label_zh", f"%{q_escaped}%")
            .limit(8)
            .execute()
            .data,
        )
        tags = [SuggestTag(id=str(row["id"]), label=str(row["label_zh"])) for row in rows]

        return SuggestResponse(completions=completions, tags=tags)
