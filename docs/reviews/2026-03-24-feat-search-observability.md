# Code Review Log: feat/search-observability

**Date:** 2026-03-24
**Branch:** feat/search-observability
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (12 total)

| Severity  | File:Line                                                     | Description                                                                                                                                          | Flagged By                              |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Critical  | `supabase/migrations/20260324000001_create_search_events.sql` | No RLS on `search_events` table — conflicts with CLAUDE.md "RLS required on all user-facing tables" (design doc says intentional for internal table) | Bug Hunter, Standards, Architecture     |
| Critical  | `backend/api/search.py:21-65`                                 | Async functions `_log_search_event` and `_track_search_analytics` contain zero `await` expressions — sync I/O blocks event loop when run as tasks    | Bug Hunter                              |
| Important | `backend/api/search.py:41,65`                                 | `query_text` passed to structlog warning as structured field — PII outside Supabase, violates PDPA rule                                              | Bug Hunter, Standards                   |
| Important | `backend/api/search.py:55-65`                                 | `query_text` in PostHog event properties — PII outside Supabase (SPEC.md §6 explicitly includes it; design intent may be deliberate)                 | Standards, Architecture                 |
| Important | `backend/tests/providers/test_posthog_adapter.py`             | 109-line test suite replaced with 3 tests — coverage regression for `identify`, `page`, `__init__`, and error paths                                  | Standards, Architecture, Plan Alignment |
| Important | `backend/api/search.py:88-93`                                 | `asyncio.create_task` used instead of FastAPI `BackgroundTasks` — inconsistent with rest of codebase, lifecycle-unsafe                               | Architecture                            |
| Important | `backend/tests/api/test_search.py:35,71,130`                  | `SearchService` (internal module) mocked instead of letting it run with boundaries mocked — violates "mock at boundaries only" rule                  | Test Philosophy                         |
| Minor     | `backend/api/search.py:85`                                    | `get_admin_db()` called as plain function instead of injected via `Depends` — breaks testability and consistency                                     | Bug Hunter                              |
| Minor     | `backend/api/search.py:53-54`                                 | `get_analytics_provider()` instantiated per request inside fire-and-forget coroutine                                                                 | Standards, Architecture                 |
| Minor     | `backend/core/config.py:50`                                   | `anon_salt` default is weak dev sentinel `"caferoam-dev-salt"` — silent failure path                                                                 | Standards, Architecture                 |
| Minor     | `.env.example`                                                | `ANON_SALT` missing from env example (blocked by security hook during session)                                                                       | Bug Hunter, Plan Alignment              |
| Minor     | `backend/tests/api/test_search.py:38,73,124`                  | `asyncio` standard library patched to intercept `create_task` — implementation-coupled test                                                          | Test Philosophy, Architecture           |

### Validation Results

**False positives skipped (3):**

- `supabase/migrations/20260324000001_create_search_events.sql` — RLS intentionally omitted; design doc explicitly marks as "internal analytics table, not user-facing"
- `backend/api/search.py:55-65` — `query_text` in PostHog event is required by SPEC.md §6 Observability
- `backend/api/search.py:85` — `get_admin_db()` is a plain factory function; direct call is correct

**Issues to fix (9):**

| #   | Severity  | Status                                                                                                          |
| --- | --------- | --------------------------------------------------------------------------------------------------------------- |
| 2   | Critical  | Fixed — refactored to BackgroundTasks + sync functions                                                          |
| 3   | Important | Fixed — removed query_text from structlog warnings                                                              |
| 5   | Important | Fixed — restored deleted PostHog adapter test coverage                                                          |
| 6   | Important | Fixed — BackgroundTasks replaces asyncio.create_task                                                            |
| 7   | Important | Fixed — SearchService mock removed; boundaries mocked via Depends overrides                                     |
| 9   | Minor     | Fixed — analytics injected via Depends (once per request)                                                       |
| 10  | Minor     | Fixed — pydantic model_validator raises on dev salt in non-dev env                                              |
| 11  | Minor     | MANUAL — .env.example blocked by security hook; add `ANON_SALT=change-me-in-production` under Analytics section |
| 12  | Minor     | Fixed — resolved naturally by switching to BackgroundTasks                                                      |

---

## Fix Pass 1

**Pre-fix SHA:** 7631d8739e8fb732065582e72ce333c5c88d8750

**Issues fixed:**

- [Critical] `backend/api/search.py` — Removed async from fire-and-forget functions; switched asyncio.create_task to FastAPI BackgroundTasks; injected admin_db and analytics via Depends
- [Important] `backend/api/search.py:41,65` — Removed query_text from structlog warning fields (PDPA guard)
- [Important] `backend/tests/providers/test_posthog_adapter.py` — Restored 9 deleted tests for identify, page, init, and error handling
- [Important] `backend/api/search.py:88-93` — BackgroundTasks replaces asyncio.create_task
- [Important] `backend/tests/api/test_search.py` — SearchService mock removed; mocking at boundaries via app.dependency_overrides
- [Minor] `backend/api/search.py:53-54` — get_analytics_provider() resolved once via Depends
- [Minor] `backend/core/config.py` — pydantic model_validator added; raises at startup on dev sentinel in production
- [Minor] `backend/tests/api/test_search.py:38,73,124` — asyncio patching removed (resolved by BackgroundTasks switch)

**Issues skipped (manual):**

- `.env.example` — security hook blocks all .env\* writes; must be added manually

**Batch Test Run:**

- `cd backend && uv run pytest` — PASS (495 passed, 0 failures)

---

## Pass 2 — Re-Verify (Smart Routing)

_Agents re-run: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Test Philosophy (Sonnet), Plan Alignment (Sonnet)_
_Agents skipped (Minor-only): None — all agents had ≥1 Important finding in Pass 1_

### Previously Flagged Issues — Resolution Status

- [Critical] `backend/api/search.py:21-65` — Async helpers with no await / BackgroundTasks — ✓ Resolved
- [Important] `backend/api/search.py:41,65` — query_text in structlog warnings — ✓ Resolved
- [Important] `backend/tests/providers/test_posthog_adapter.py` — Coverage regression — ✓ Resolved
- [Important] `backend/api/search.py:88-93` — asyncio.create_task vs BackgroundTasks — ✓ Resolved
- [Important] `backend/tests/api/test_search.py:35,71,130` — SearchService internal mock — ✓ Resolved
- [Minor] `backend/api/search.py:53-54` — Provider instantiated per-request — ✓ Resolved
- [Minor] `backend/core/config.py:50` — Weak anon_salt default — ✓ Resolved
- [Minor] `.env.example` — ANON_SALT missing — Open (security hook blocks write; manual step required)
- [Minor] `backend/tests/api/test_search.py:38,73,124` — asyncio patching — ✓ Resolved (via BackgroundTasks)

### New Issues Found

None — no regressions introduced by fix pass.

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**

- [Minor] `.env.example` — `ANON_SALT=change-me-in-production` must be added manually under the Analytics section (security hook blocks automated `.env*` writes)

**Review log:** `docs/reviews/2026-03-24-feat-search-observability.md`
