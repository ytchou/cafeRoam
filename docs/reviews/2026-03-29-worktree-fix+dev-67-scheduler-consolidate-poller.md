# Code Review Log: worktree-fix+dev-67-scheduler-consolidate-poller

**Date:** 2026-03-29
**Branch:** worktree-fix+dev-67-scheduler-consolidate-poller
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet)_

### Issues Found (8 total)

| Severity  | File:Line            | Description                                                                                | Flagged By                          |
| --------- | -------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| Important | queue.py:78-99       | `get_pending_job_types` fetches all pending rows — O(N-rows) DB transfer for O(12) result  | Bug Hunter, Standards, Architecture |
| Important | scheduler.py:231-235 | No error handling in `poll_pending_job_types` — DB errors drop silently, no Sentry capture | Bug Hunter                          |
| Important | scheduler.py:234-235 | Sequential dispatch adds (N-1)×rpc_latency vs old concurrent approach                      | Bug Hunter                          |
| Important | scheduler.py:276     | `misfire_grace_time=poll_interval` could create degradation spiral under load              | Bug Hunter                          |
| Minor     | queue.py:95-98       | Unknown `job_type` values silently swallowed with no log warning                           | Bug Hunter                          |
| Minor     | scheduler.py:231-232 | N+1 DB client constructions per poll cycle                                                 | Bug Hunter                          |
| Minor     | scheduler.py:230     | Redundant docstring in `poll_pending_job_types`                                            | Standards                           |
| Minor     | test_queue.py        | Nested MagicMock chains fragile against implementation changes (pre-existing)              | Architecture                        |

### Validation Results

| #                              | Classification | Outcome                                                          |
| ------------------------------ | -------------- | ---------------------------------------------------------------- |
| F1 Unbounded row fetch         | Valid          | Fixed — RPC with SELECT DISTINCT                                 |
| F2 No Sentry on poll errors    | Valid          | Fixed — try/except + sentry_sdk.capture_exception                |
| F3 Sequential dispatch         | Debatable      | Fixed — asyncio.gather                                           |
| F4 misfire_grace_time spiral   | Debatable      | Left as-is (mitigated by F1 fix; coalesce=True prevents pile-up) |
| F5 Silent ValueError           | Valid          | Fixed — logger.warning                                           |
| F6 N+1 DB client constructions | Incorrect      | Skipped — each client construction does distinct work            |
| F7 Redundant docstring         | Incorrect      | Skipped — adds context at scheduler registration callsite        |
| F8 MagicMock fragility         | Debatable      | Superseded — tests rewritten to use RPC mock (simpler)           |

**Skipped false positives:** 2 (F6, F7)

---

## Fix Pass 1

**Pre-fix SHA:** f7d494c8101a82b731717d9497544aaae1e657e3
**Issues fixed:**

- [Important] queue.py — Replaced table scan with `get_pending_job_types()` RPC (SELECT DISTINCT server-side); added migration `20260329000001_create_get_pending_job_types_rpc.sql`
- [Important] scheduler.py — Added `try/except Exception` with `sentry_sdk.capture_exception` around poll body
- [Important] scheduler.py — Replaced sequential `for`-loop with `asyncio.gather`
- [Minor] queue.py — Added `logger.warning` for unknown job_type values; added structlog import

**Issues skipped (false positives):** F6, F7

**Batch Test Run:**

- `uv run pytest` — PASS (708 passed, 0 failures)

---

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter_
_Agents skipped (Minor-only after dedup): Standards, Architecture_

### Previously Flagged Issues — Resolution Status

- [Important] queue.py:78-99 — Resolved (RPC with SELECT DISTINCT)
- [Important] scheduler.py:231-235 — Resolved (try/except + Sentry)
- [Important] scheduler.py:234-235 — Resolved (asyncio.gather)
- [Minor] queue.py:95-98 — Resolved (logger.warning)

### New Issues Found (2)

| Severity  | File:Line        | Description                                                                                       | Flagged By |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| Important | scheduler.py:235 | `asyncio.gather` default `return_exceptions=False` abandons remaining coroutines on first failure | Bug Hunter |
| Minor     | migration:line 9 | `STABLE` volatility wrong for a function querying live table data — should be `VOLATILE`          | Bug Hunter |

---

## Fix Pass 2

**Pre-fix SHA:** c203113
**Issues fixed:**

- [Important] scheduler.py — Added `return_exceptions=True` to `asyncio.gather`; log + capture each per-type exception
- [Minor] migration — Changed `STABLE` → `VOLATILE`

**Batch Test Run:**

- `uv run pytest tests/workers/` — PASS (13 passed)

---

## Final State

**Iterations completed:** 2
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-29-worktree-fix+dev-67-scheduler-consolidate-poller.md
