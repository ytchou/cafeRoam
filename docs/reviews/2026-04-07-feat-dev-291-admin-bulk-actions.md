# Code Review Log: feat/dev-291-admin-bulk-actions

**Date:** 2026-04-07
**Branch:** feat/dev-291-admin-bulk-actions
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Test Philosophy_

### Issues Found (8 total)

| Severity  | File:Line                                                  | Description                                                                                                                                                                                                      | Flagged By                        | Status    |
| --------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------- |
| Important | backend/api/admin.py:241-296                               | N+1 DB queries in approve_submissions_bulk: per-submission SELECT + UPDATE + shop UPDATE in a loop (up to 50 iterations = 150+ queries). Violates CLAUDE.md "No work in loops" and "No N+1 queries"              | Architecture & Design             | valid     |
| Important | backend/api/admin.py:314-354                               | N+1 DB queries in reject_submissions_bulk: same per-item loop pattern with SELECT + UPDATE + RPC + shop UPDATE per iteration                                                                                     | Architecture & Design             | valid     |
| Important | backend/api/admin.py:252                                   | Unsafe `[0]` array indexing: `sub = sub_rows[0]` — should use project's `first()` helper per CLAUDE.md rule                                                                                                      | Standards & Conventions           | valid     |
| Important | backend/api/admin.py:325                                   | Unsafe `[0]` array indexing: `sub = sub_rows[0]` — same issue in reject_submissions_bulk                                                                                                                         | Standards & Conventions           | valid     |
| Important | app/(admin)/admin/shops/\_components/ShopTable.tsx:378-419 | Duplicated inline retry logic in per-row dropdown handler. Full fetch/toast/error handling duplicated from handleBulkRetry. Also has race condition: saves/restores selectedShopIds state during async operation | Bug Hunter, Architecture & Design | valid     |
| Important | app/(admin)/admin/\_components/SubmissionsTab.tsx:391-431  | Custom div modal for bulk reject bypasses existing ConfirmDialog component. Missing focus trap, escape key handling, and screen reader announcements                                                             | Architecture & Design             | valid     |
| Important | app/(admin)/admin/shops/\_components/ShopTable.tsx:487-537 | Same custom div modal issue for shop bulk reject dialog — missing accessibility features vs ConfirmDialog                                                                                                        | Architecture & Design             | valid     |
| Minor     | backend/api/admin_shops.py:9-19                            | Defensive try/except ImportError with duplicated RejectionReasonType literal. The import from api.admin should always succeed; if it doesn't, production is broken. Duplicated literal risks silent drift        | Standards & Conventions           | debatable |

### Validation Results

**Valid (7):** All Important-severity issues confirmed by reading full files and tracing logic.

**Debatable (1):** The try/except ImportError pattern (admin_shops.py:9-19) may be a test isolation guard. Current code works, but the duplication is a maintenance risk. Fixing is low-risk so lean conservative — fix anyway.

**Skipped (0):** No false positives identified.

### Notes

- Plan alignment: All 5 acceptance criteria from the plan doc appear implemented. No missing pieces.
- Test coverage: Tests exist for all new endpoints and UI interactions. Test quality is adequate — mocks at boundaries, realistic-ish data.
- Test philosophy: ShopTable.test.tsx mocks `@/components/ui/dropdown-menu` (an internal UI component, not a system boundary). This is technically a test philosophy violation but is pragmatic for Radix portal behavior in jsdom. Not flagged as an issue.
- Proxy routes: All 4 proxy routes correctly use `proxyToBackend` with no business logic — compliant with file ownership rules.
- The shadcn Checkbox vs native input inconsistency is cosmetic and not flagged (admin-only, low impact).

## Fix Pass 1

**Pre-fix SHA:** 85cade492d93c9b8504b9b0a4d30c5bab7e5dec7
**Issues fixed:**

- [Important] backend/api/admin.py:241-296 — approve_submissions_bulk: replaced per-iteration SELECT with single batch IN() query; pre-index subs_by_id dict before loop
- [Important] backend/api/admin.py:314-354 — reject_submissions_bulk: same batch IN() fetch optimization
- [Important] backend/api/admin.py:252 — replaced sub_rows[0] with first() (then made obsolete by dict lookup)
- [Important] backend/api/admin.py:325 — same [0] indexing eliminated via dict lookup pattern
- [Important] app/(admin)/admin/shops/\_components/ShopTable.tsx:378-419 — extracted handleRetry(shopIds); removed save/restore selectedShopIds race condition
- [Important] app/(admin)/admin/\_components/SubmissionsTab.tsx:391-431 — replaced custom div modal with shadcn Dialog (focus trap, escape key, aria-modal via Radix)
- [Important] app/(admin)/admin/shops/\_components/ShopTable.tsx:487-537 — same custom div modal replaced with shadcn Dialog
- [Minor] backend/api/admin_shops.py:9-19 — removed try/except ImportError; direct import of RejectionReasonType; removed unused Literal import

**Batch Test Run:**

- `pnpm test` — PASS (1246 tests, 225 files)
- `cd backend && uv run pytest` — FAIL → fixed (test mocks updated from .eq() to .in\_() after batch-fetch refactor) → PASS (907 tests)

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment_
_Agents skipped: none (all had Important-severity findings)_

### Previously Flagged Issues — Resolution Status

- [Important] backend/api/admin.py:241-296 — ✓ Resolved
- [Important] backend/api/admin.py:314-354 — ✓ Resolved
- [Important] backend/api/admin.py:252 — ✓ Resolved
- [Important] backend/api/admin.py:325 — ✓ Resolved
- [Important] app/(admin)/admin/shops/\_components/ShopTable.tsx:378-419 — ✓ Resolved
- [Important] app/(admin)/admin/\_components/SubmissionsTab.tsx:391-431 — ✓ Resolved
- [Important] app/(admin)/admin/shops/\_components/ShopTable.tsx:487-537 — ✓ Resolved
- [Minor] backend/api/admin_shops.py:9-19 — ✓ Resolved

### New Issues Found (0)

No regressions introduced.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-07-feat-dev-291-admin-bulk-actions.md
