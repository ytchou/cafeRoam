# Code Review Log: fix/dev-326-loading-states

**Date:** 2026-04-13
**Branch:** fix/dev-326-loading-states
**Mode:** Post-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)*

### Issues Found (1 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Minor | components/shops/follow-button.test.tsx:194 | Duplicate test: 'given a user is toggling follow...' appears at lines 114 and 194 | Test Philosophy |

### Validation Results

All findings validated. 1 valid issue to fix.

**Bug Hunter:** No issues found. The implementation is correct:
- Optimistic state in save-popover.tsx properly captures previous state, applies optimistic update, and rolls back on error
- useTransition in shop-card.tsx correctly wraps router.push for pending state
- Button primitive correctly computes content before Comp render (preserving asChild path)
- aria-busy is correctly set as `true` when loading (not string "true")

**Standards & Conventions:** No CLAUDE.md violations. Code follows project patterns:
- Mock boundaries respected (HTTP layer mocked, not internal hooks except where necessary for test isolation)
- Performance standards followed (Map used for localOverrides in save-popover)
- Testing conventions followed with user-journey-framed test names

**Architecture & Design:** Clean three-layer design as specified:
1. Global progress bar (next-nprogress-bar) for route transitions
2. Button primitive extension (loading + loadingText props)
3. Optimistic SWR pattern in save-popover

**Plan Alignment:** All 10 tasks from the plan appear complete:
- Task 1: next-nprogress-bar installed and wired in layout.tsx
- Task 2: Button primitive extended with loading/loadingText
- Task 3: check-in-popover migrated
- Task 4: dashboard-edit migrated
- Task 5: follow-button migrated
- Task 6: save-popover optimistic refactor complete
- Task 7: shop-card useTransition implemented
- Task 8: search-bar isSearching + 搜尋中... implemented

**Design Quality:** No design violations. The hardcoded `#2c1810` in AppProgressBar is the Espresso color explicitly specified in DESIGN.md for active/selected state backgrounds — this is correct usage for the progress bar.

**Test Philosophy:** 1 issue found:
- Duplicate test in follow-button.test.tsx (lines 114 and 194 are identical)

## Fix Pass 1
**Pre-fix SHA:** 779c13db283f240fe3b4a69d630053fb292a9991
**Issues fixed:**
- [Minor] components/shops/follow-button.test.tsx:194 — Removed duplicate test 'given a user is toggling follow, the button shows aria-busy while the request is in-flight'. The test appeared identically at line 114 and line 194; the second occurrence was removed.
**Issues skipped (false positives):** None

**Batch Test + Lint Run:**
- `pnpm test` — PASS (1310 tests passed)
- `pnpm lint` — PASS (0 errors, 4 warnings: unused vars in save-popover.test.tsx)

## Pass 2 — Re-Verify

**Agents re-run:** None

**Agents skipped (Minor-only):** Test Philosophy

### Previously Flagged Issues — Resolution Status

- [Minor] components/shops/follow-button.test.tsx:194 — ✓ Resolved
  - Duplicate test removed (26 lines deleted)
  - Fix diff confirms the second occurrence of 'given a user is toggling follow, the button shows aria-busy while the request is in-flight' was cleanly removed

### New Issues Found (0)

No new issues detected.

---

**Verification complete.** All flagged issues resolved. No agents produced new findings.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes (none found)
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-13-fix-dev-326-loading-states.md
