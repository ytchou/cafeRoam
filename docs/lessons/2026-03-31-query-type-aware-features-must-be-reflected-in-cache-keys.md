# Query-type-aware features must be reflected in cache keys

**Date:** 2026-03-31
**Context:** DEV-122 search quality review — Option C+ scoring by query_type
**What happened:** The cache key was `(normalized_text, mode)` only. Two queries that normalize to the same string but classify differently (e.g., `"手沖"` as `item_specific` vs `generic`) collided. The cached `total_score` values reflected whichever query_type populated the cache first, silently making Option C+ a no-op for warm queries.
**Root cause:** The feature (query_type-dependent scoring) was implemented correctly in the search pipeline but the cache layer was not updated to account for the new routing dimension.
**Prevention:** When adding a new dimension that changes search results or scoring, always ask: "Is this dimension reflected in every cache key that stores those results?" Any routing signal that changes the output must be part of the cache key.
