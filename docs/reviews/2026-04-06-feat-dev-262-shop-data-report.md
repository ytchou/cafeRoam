# Code Review Log: feat/dev-262-shop-data-report

**Date:** 2026-04-06
**Branch:** feat/dev-262-shop-data-report
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)*
*Adversarial Review (Codex): unavailable — skipped*

### Issues Found (7 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | backend/providers/issue_tracker/linear_adapter.py:57 | `await response.json()` — httpx Response.json() is synchronous; await on a non-coroutine raises TypeError at runtime. Tests pass only because mock uses AsyncMock. | Bug Hunter |
| Critical | backend/workers/handlers/shop_data_report.py:20 | `.order("created_at")` references non-existent column — table has `reported_at`. PostgREST will return an error at runtime. | Bug Hunter |
| Important | .env.example | Missing `LINEAR_API_KEY` and `LINEAR_TEAM_ID` env vars. CLAUDE.md: "Use .env.example for documentation only" + "When adding a new service, external dependency, or env var, update scripts/doctor.sh." | Standards |
| Important | scripts/doctor.sh | No health check for new Linear/issue tracker integration. CLAUDE.md: "The doctor script must grow with the project." | Standards |
| Important | backend/workers/handlers/shop_data_report.py:38-47 | No error handling around `issue_tracker.create_issue()`. If Linear API fails, exception propagates, status update skipped, idempotent_cron lock prevents retry until next day. Reports stuck as "pending" 24h, then re-sent as duplicates. | Architecture |
| Minor | backend/providers/issue_tracker/linear_adapter.py:62 | Uses `errors[0]` instead of project's `first()` helper. CLAUDE.md: "Never use unsafe [0] array indexing." Guarded by `if errors else` but violates convention. | Standards |
| Minor | components/shops/report-issue-dialog.tsx:40-41 | Form state (field, description) not reset when dialog closes without submission. Old draft text persists on re-open. | Architecture |

### Validation Results

| Finding | Status | Notes |
|---------|--------|-------|
| linear_adapter.py:57 await response.json() | Valid | httpx Response.json() confirmed synchronous. await raises TypeError. |
| shop_data_report.py:20 created_at | Valid | Migration defines reported_at, not created_at. Runtime PostgREST error. |
| .env.example missing vars | Valid | CLAUDE.md explicit about .env.example documentation. |
| doctor.sh missing check | Valid | CLAUDE.md explicit about doctor.sh growing with project. |
| No error handling in handler | Debatable | Duplicate Linear issue on retry is annoying but not catastrophic for internal ops digest. Fix anyway. |
| errors[0] indexing | Valid | CLAUDE.md rule, first() helper exists in codebase. |
| Form state not reset | Debatable | Could be intentional draft preservation. Fix anyway (lean conservative). |

## Fix Pass 1
**Pre-fix SHA:** 7896abb33b54f7a8c43010ccb8ca741962d1d5a7
**Issues fixed:**
- [Critical] backend/providers/issue_tracker/linear_adapter.py:57 — removed `await` from synchronous `response.json()`
- [Critical] backend/workers/handlers/shop_data_report.py:20 — changed `.order("created_at")` to `.order("reported_at")`
- [Critical+] components/shops/report-issue-dialog.tsx:22 — created components/ui/textarea.tsx (missing shadcn component)
- [Critical+] components/shops/report-issue-dialog.tsx:101 — added explicit `React.ChangeEvent<HTMLTextAreaElement>` type (TS strict)
- [Important] .env.example — added Issue Tracker section with LINEAR_API_KEY and LINEAR_TEAM_ID
- [Important] scripts/doctor.sh — added checks for LINEAR_API_KEY and LINEAR_TEAM_ID
- [Important] backend/workers/handlers/shop_data_report.py:38-47 — wrapped create_issue() in try/except; on failure logs and returns without status update (allowing retry next run)
- [Minor] backend/providers/issue_tracker/linear_adapter.py:62 — replaced `errors[0]` with `first(errors, "Linear errors")`
- [Minor] components/shops/report-issue-dialog.tsx:40-41 — added useEffect to reset form state when dialog closes
- [Test fix] backend/tests/providers/test_issue_tracker.py — updated mock_response from AsyncMock to MagicMock after removing await

**Batch Test Run:**
- `pnpm test` — PASS (1234/1234)
- `cd backend && uv run pytest` — 2 failures → fixed in a7a6587 → PASS (857/857)

## Pass 2 — Re-Verify
*Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design*
*Agents skipped (no findings): none*
*Agents skipped (Minor-only): none*

### Previously Flagged Issues — Resolution Status
- [Critical] backend/providers/issue_tracker/linear_adapter.py:57 — ✓ Resolved
- [Critical] backend/workers/handlers/shop_data_report.py:20 — ✓ Resolved
- [Important] .env.example — ✓ Resolved
- [Important] scripts/doctor.sh — ✓ Resolved
- [Important] backend/workers/handlers/shop_data_report.py:38-47 — ✓ Resolved
- [Minor] backend/providers/issue_tracker/linear_adapter.py:62 — ✓ Resolved
- [Minor] components/shops/report-issue-dialog.tsx:40-41 — ✓ Resolved

### New Issues Found (1)
| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Minor | components/shops/report-issue-dialog.tsx:44-49 | useEffect reset omitted setIsSubmitting(false) — dialog re-opens with button disabled if closed during in-flight submit | Bug Hunter |

→ Fixed immediately: `setIsSubmitting(false)` added to reset effect (commit: reset isSubmitting state when report dialog closes)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-06-feat-dev-262-shop-data-report.md
