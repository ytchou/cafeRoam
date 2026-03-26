# Code Review Log: feat/dev-36-search-cache

**Date:** 2026-03-26
**Branch:** feat/dev-36-search-cache
**Mode:** Pre-PR
**HEAD SHA:** 9b307df9dcc08594cebca81ca59e1a338373aec7

---

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (14 total)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Critical | `backend/api/search.py:63` | `isinstance(results[0], dict)` cache-hit detection: fails for empty result sets (cache_hit=False in search_events), business logic in HTTP proxy layer, fragile implicit contract between API and service | Bug Hunter, Standards, Architecture, Plan Alignment |
| 2 | Important | `backend/providers/cache/interface.py:4-15`, `supabase_adapter.py:13-23` | Duplicate `CacheEntry` class: `interface.py` defines an uninstantiable bare class (no `@dataclass`, no `__init__`); `supabase_adapter.py` defines the real `@dataclass` — two definitions of the same concept | Bug Hunter, Standards, Architecture |
| 3 | Important | `backend/providers/cache/supabase_adapter.py:55` | `SELECT *` on `search_cache` fetches `query_embedding` vector(1536) (~6KB) on every Tier 1 hit, even though the embedding is never used by Tier 1 logic | Bug Hunter, Standards, Architecture |
| 4 | Important | `backend/providers/cache/supabase_adapter.py` (all 4 async methods) | Synchronous Supabase calls inside `async def` methods block the FastAPI event loop on every cache read/write — adds 2–3 synchronous DB round-trips per cache-miss request | Bug Hunter |
| 5 | Important | `backend/providers/cache/supabase_adapter.py:94-105` | `store()` unconditionally resets `hit_count: 0` on upsert conflict — silently destroys hit count if same query_hash is re-stored before TTL expiry (race condition) | Architecture |
| 6 | Important | `supabase/migrations/20260327000003_create_search_cache_rpcs.sql:23-39` | `search_cache_similar` RPC lacks `hnsw.ef_search` session variable — without bounding the ANN candidate set, the threshold-only filter can be slow at scale (tens of thousands of entries) | Architecture |
| 7 | Important | `backend/tests/services/test_search_service.py:11-18` | Mock violation: `reset_idf_cache` fixture directly mutates private module state (`_IDF_CACHE`, `_IDF_CACHE_AT`) — internal implementation, not a system boundary | Test Philosophy |
| 8 | Important | `supabase/migrations/20260327000003_create_search_cache_rpcs.sql` | `pg_cron` cleanup job specified in design doc is not registered in any migration — expired rows accumulate unboundedly in production | Plan Alignment |
| 9 | Minor | `backend/providers/cache/supabase_adapter.py:28-32` | `_parse_entry` fails open: `ValueError`/`TypeError` on `expires_at` parse silently sets `is_expired=False` — a malformed timestamp would cause stale entries to be served indefinitely (mitigated by DB-level `expires_at > now()` filter, but fail-closed is safer) | Bug Hunter, Architecture |
| 10 | Minor | `backend/services/search_service.py:66-68` | `store()` runs synchronously in the request path — a slow or failing cache write adds latency and can propagate errors to the user; should be fire-and-forget (background task) | Architecture |
| 11 | Minor | `backend/providers/cache/interface.py` | `CacheEntry` defined as a plain class (no `@dataclass`) in interface.py — the authoritative definition should live here; supabase_adapter should import from interface | Standards |
| 12 | Minor | `backend/tests/services/test_search_service.py:41` | Test asserts the pre-normalization string as the embed input — the test input is already normalized, so it passes without exercising normalization | Bug Hunter |
| 13 | Minor | Multiple test files | Naming violations: test names framed around implementation details rather than user/system outcomes | Test Philosophy |
| 14 | Minor | Multiple test files | Test data violations: placeholder strings (`"test"`, `"TestShop"`, `"CachedShop"`) instead of realistic values | Test Philosophy |

---

## Fix Pass 1

**Pre-fix SHA:** `9b307df9dcc08594cebca81ca59e1a338373aec7`
**Post-fix SHA:** `d1da6e7` (see `git log`)

**Issues fixed:**
- [Critical] `api/search.py:63` — Replaced `isinstance(results[0], dict)` with explicit `SearchResponse(results, cache_hit)` returned from service; API reads `response.cache_hit` directly
- [Important] `interface.py` / `supabase_adapter.py` — Consolidated `CacheEntry` into single `@dataclass` in `interface.py`; adapter now imports from interface
- [Important] `supabase_adapter.py:55` — `SELECT *` replaced with `_CACHE_SELECT_COLS` (excludes `query_embedding` vector)
- [Important] All 4 `async def` methods — Wrapped sync Supabase calls in `asyncio.to_thread(lambda: ...)`
- [Important] `store()` — Removed `hit_count: 0` from upsert payload; DB DEFAULT handles new rows, existing rows retain accumulated count
- [Important] `migrations/20260327000003` — Added `SET LOCAL hnsw.ef_search = 40` to `search_cache_similar` RPC
- [Important] `migrations/20260327000004` (new) — Conditional `DO $$` block registers pg_cron hourly cleanup if extension is enabled
- [Minor] `supabase_adapter.py:31` — `_parse_entry` fail-open → fail-closed on malformed timestamp
- [Minor] `test_search_service.py` — All tests updated to use `response.results`; added `cache_hit` assertions; fixed normalization test (now exercises normalizer with uppercase + punctuation input)
- [Minor] Test data — Replaced placeholder strings (`"test"`, `"CachedShop"`, `"TestShop"`, `"SimilarShop"`) with realistic values across test files

**Batch Test Run:**
- `cd backend && uv run pytest` — **PASS** (630 passed, 5 warnings)
- `uv run ruff check .` — **PASS** (all checks passed)
- `uv run ruff format --check .` — **PASS** (after auto-format)

---

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter, Standards, Architecture, Plan Alignment*
*Agents skipped (Minor-only findings): Test Philosophy*

### Previously Flagged Issues — Resolution Status
- [Critical] `api/search.py:63` isinstance detection — ✓ Resolved
- [Important] Duplicate CacheEntry — ✓ Resolved
- [Important] SELECT * — ✓ Resolved
- [Important] Sync calls in async methods — ✓ Resolved
- [Important] hit_count reset on upsert — ✓ Resolved
- [Important] Missing hnsw.ef_search — ✓ Resolved
- [Important] pg_cron not registered — ✓ Resolved
- [Minor] _parse_entry fail-open — ✓ Resolved
- [Minor] Normalization test — ✓ Resolved
- [Minor] Test data placeholders — ✓ Resolved

### New Issues Found: None

**Early exit condition met** — no Critical or Important issues remain.

---

### Validation Results

| Issue | Classification | Notes |
|-------|---------------|-------|
| 1 | **Valid** | Empty-list false negative confirmed; business logic in HTTP layer is a real CLAUDE.md violation |
| 2 | **Valid** | Two incompatible `CacheEntry` definitions confirmed |
| 3 | **Valid** | `SELECT *` confirmed, embedding column fetched but unused on Tier 1 hit |
| 4 | **Valid** | Sync supabase-py calls confirmed in `async def` methods with no `run_in_executor` |
| 5 | **Valid** | `hit_count: 0` hardcoded on upsert, resets counters on re-store |
| 6 | **Valid** | `hnsw.ef_search` absent from RPC, confirmed in migration SQL |
| 7 | **Incorrect (skip)** | Module-level state reset in autouse fixture is the correct pytest pattern; not a mock violation |
| 8 | **Debatable** | Comment explicitly defers pg_cron to dashboard; risky for production |
| 9 | **Debatable** | Fail-open is harmless in practice since DB-level filter runs first |
| 10 | **Incorrect (skip)** | `await` is correctly present in search_service.py; symptom of Issue 4, not independent bug |
| 11 | **Valid** | Covered by Issue 2 fix |
| 12 | **Valid** | Test assertion passes by coincidence; exercises no normalization |
| 13-14 | **Debatable** | Marginal naming/data issues exist in test files |

**Skipped (2 false positives):**
- `test_search_service.py:11-18` (Issue 7) — autouse fixture resetting module-level state is correct pytest pattern
- `search_service.py:66-68` (Issue 10) — duplicate of Issue 4; `await` is present

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** `docs/reviews/2026-03-26-feat-dev-36-search-cache.md`
