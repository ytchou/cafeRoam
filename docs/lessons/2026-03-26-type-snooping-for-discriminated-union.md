# Type-snooping as cache-hit signal leaks business logic into HTTP layer

**Date:** 2026-03-26
**Context:** DEV-36 semantic search cache — detecting whether a search result came from cache

**What happened:**
`search_service.py` returns either `list[SearchResult]` (full search) or `list[dict]` (cache hit). `api/search.py` detected the cache path by type-snooping on the first element: `isinstance(results[0], dict)`. This broke for empty result lists (the most common cache hit for uncommon queries), and placed business-layer logic (cache provenance) inside the HTTP proxy layer.

**Root cause:**
When a function returns a discriminated union (`list[SearchResult] | list[dict]`), it is tempting for the caller to re-derive the discriminant from the shape of the data rather than having the callee return the discriminant explicitly.

**Prevention:**
When a service returns different logical variants (cache hit vs. fresh result), encode the variant as an explicit field on a return type:

```python
@dataclass
class SearchResponse:
    results: list
    cache_hit: bool
```

The service returns `SearchResponse(results=..., cache_hit=True/False)`. The caller reads `.cache_hit` directly — no type inspection, no empty-list edge cases, no cross-layer coupling.

Rule: **never let a caller infer a discriminant from data shape when the callee already knows it.**
