# Code Review Log: feat/observability-ops

**Date:** 2026-02-27
**Branch:** feat/observability-ops
**Mode:** Pre-PR
**HEAD SHA:** 3bfd126802d40905d40c8cee1ccc4641098ed98e

---

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Opus), Plan Alignment (Sonnet)*

### Issues Found (7 total — after dedup)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | `backend/main.py:89` | Health check leaks raw exception strings (info disclosure) | Bug Hunter, Standards, Architecture |
| Important | `backend/main.py:71-95` | Deep health check has no timeout — can hang and exhaust workers | Architecture |
| Important | `backend/middleware/request_id.py:16-22` | Request ID not bound to structlog context/Sentry scope — useless for correlation | Bug Hunter, Architecture |
| Important | `backend/middleware/request_id.py:16` | Incoming X-Request-ID header ignored — breaks end-to-end tracing | Bug Hunter |
| Important | `app/__tests__/sentry-init.test.ts:17` | Vacuous test (`expect(true).toBe(true)`) — provides no coverage guarantee | Standards, Architecture |
| Minor | `backend/tests/test_sentry_init.py` | `send_default_pii=False` not asserted — privacy-sensitive regression surface | Plan Alignment |
| Minor | `next.config.ts:14-16` | `silent: !process.env.CI` noisy locally; `disableLogger: true` missing from plan | Bug Hunter, Plan Alignment |

### False Positives Skipped

- **Standards: `sentry_sdk` called directly in `main.py` and `scheduler.py`** — Architecture agent explicitly assessed this as acceptable: Sentry is infrastructure glue, not business logic. Wrapping in a Protocol/adapter/factory would add 3 files for 2 call sites with no realistic swap scenario. The `_init_sentry()` function already provides a clean seam for testing.
- **Plan Alignment: missing `supabase_auth` health check** — This appears in the design doc but was never carried into the plan. The plan is the authoritative execution target. Design-to-plan gap only, not an implementation regression.
- **Bug Hunter: PostHog `useEffect` no cleanup** — `posthog-js` internally checks `__loaded` and is idempotent on re-init. Not a real bug.

### Validation Results

- Skipped (false positive × 3): see above
- Proceeding to fix: 5 Important + 2 Minor = 7 valid issues

---

## Fix Pass 1

**Pre-fix SHA:** 3bfd126802d40905d40c8cee1ccc4641098ed98e

*(Populated during fix phase)*
