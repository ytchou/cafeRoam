import math
from typing import Any, cast

from supabase import Client

from models.types import SearchQuery, SearchResult, Shop
from providers.embeddings.interface import EmbeddingsProvider

_SHOP_FIELDS_HANDLED_SEPARATELY = {"photo_urls", "taxonomy_tags", "mode_scores"}


class SearchService:
    def __init__(self, db: Client, embeddings: EmbeddingsProvider):
        self._db = db
        self._embeddings = embeddings
        self._idf_cache: dict[str, float] | None = None

    async def search(
        self,
        query: SearchQuery,
        mode: str | None = None,
        mode_threshold: float = 0.4,
    ) -> list[SearchResult]:
        """Embed query, optionally pre-filter by mode, run pgvector similarity, apply taxonomy boost."""
        query_embedding = await self._embeddings.embed(query.text)

        limit = query.limit or 20
        rpc_params: dict[str, Any] = {
            "query_embedding": query_embedding,
            "match_count": limit,
        }

        # Mode pre-filter
        if mode and mode in ("work", "rest", "social"):
            rpc_params["filter_mode_field"] = f"mode_{mode}"
            rpc_params["filter_mode_threshold"] = mode_threshold

        if query.filters and query.filters.near_latitude and query.filters.near_longitude:
            rpc_params["filter_lat"] = query.filters.near_latitude
            rpc_params["filter_lng"] = query.filters.near_longitude
            rpc_params["filter_radius_km"] = query.filters.radius_km or 5.0

        response = self._db.rpc("search_shops", rpc_params).execute()
        rows = cast("list[dict[str, Any]]", response.data)

        # Load IDF cache if needed
        if query.filters and query.filters.dimensions:
            await self._load_idf_cache()

        results: list[SearchResult] = []
        for row in rows:
            similarity = row.get("similarity", 0.0)
            taxonomy_boost = self._compute_taxonomy_boost(row, query)

            eligible_keys = Shop.model_fields.keys() - _SHOP_FIELDS_HANDLED_SEPARATELY
            shop = Shop(
                taxonomy_tags=[],
                photo_urls=row.get("photo_urls", []),
                **{k: v for k, v in row.items() if k in eligible_keys},
            )

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

    async def _load_idf_cache(self) -> None:
        """Load IDF scores from shop_tags aggregation."""
        if self._idf_cache is not None:
            return

        response = self._db.table("shop_tags").select("tag_id, shop_count:count(*)").execute()
        rows = cast("list[dict[str, Any]]", response.data)

        self._idf_cache = {}
        for row in rows:
            tag_id = row.get("tag_id", "")
            if not tag_id:
                continue
            doc_freq = max(int(row.get("shop_count", 1)), 1)
            # IDF: rarer tags score higher (using 100 as approximate total shops)
            self._idf_cache[tag_id] = math.log(100.0 / doc_freq)

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

        if self._idf_cache:
            idf_sum = sum(self._idf_cache.get(t, 1.0) for t in matching)
            return idf_sum / max(len(shop_tags), 1)

        return len(matching) / max(len(shop_tags), 1)
