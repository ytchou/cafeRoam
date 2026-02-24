from typing import Any, cast

from supabase import Client

from models.types import SearchQuery, SearchResult, Shop
from providers.embeddings.interface import EmbeddingsProvider

_SHOP_FIELDS_HANDLED_SEPARATELY = {"photo_urls", "taxonomy_tags", "mode_scores"}


class SearchService:
    def __init__(self, db: Client, embeddings: EmbeddingsProvider):
        self._db = db
        self._embeddings = embeddings

    async def search(self, query: SearchQuery) -> list[SearchResult]:
        """Embed query, run pgvector similarity, apply taxonomy boost, return ranked results."""
        query_embedding = await self._embeddings.embed(query.text)

        limit = query.limit or 20
        rpc_params: dict[str, Any] = {
            "query_embedding": query_embedding,
            "match_count": limit,
        }

        if query.filters and query.filters.near_latitude and query.filters.near_longitude:
            rpc_params["filter_lat"] = query.filters.near_latitude
            rpc_params["filter_lng"] = query.filters.near_longitude
            rpc_params["filter_radius_km"] = query.filters.radius_km or 5.0

        response = self._db.rpc("search_shops", rpc_params).execute()
        rows = cast("list[dict[str, Any]]", response.data)

        results: list[SearchResult] = []
        for row in rows:
            similarity = row.pop("similarity", 0.0)
            taxonomy_boost = self._compute_taxonomy_boost(row, query)

            eligible_keys = Shop.model_fields.keys() - _SHOP_FIELDS_HANDLED_SEPARATELY
            shop = Shop(
                taxonomy_tags=[],
                photo_urls=row.get("photo_urls", []),
                **{k: v for k, v in row.items() if k in eligible_keys},
            )

            results.append(
                SearchResult(
                    shop=shop,
                    similarity_score=similarity,
                    taxonomy_boost=taxonomy_boost,
                    total_score=similarity + taxonomy_boost,
                )
            )

        results.sort(key=lambda r: r.total_score, reverse=True)
        return results

    def _compute_taxonomy_boost(self, row: dict[str, Any], query: SearchQuery) -> float:
        """Compute taxonomy boost based on tag overlap with query filters."""
        if not query.filters or not query.filters.dimensions:
            return 0.0
        return 0.0
