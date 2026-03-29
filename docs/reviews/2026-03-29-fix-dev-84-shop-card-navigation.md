# Code Review Log: fix/dev-84-shop-card-navigation

**Date:** 2026-03-29
**Branch:** fix/dev-84-shop-card-navigation
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (10 total)

| Severity  | File:Line                                 | Description                                                                                                 | Flagged By                    |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Important | app/shops/[shopId]/page.tsx:28            | Null-slug fallback silently redirects to `/shops/<id>/<id>` — undocumented behavior, no deliberate decision | Bug Hunter                    |
| Important | app/shops/[shopId]/page.tsx:15-17         | No network-error handler; unhandled TypeError if backend is unreachable                                     | Bug Hunter                    |
| Important | app/shops/[shopId]/page.tsx:15-17         | Duplicate fetch logic vs `[slug]/page.tsx` fetchShop — DRY violation, drift hazard                          | Architecture                  |
| Important | app/shops/[shopId]/page.tsx:16            | `revalidate: 300` on redirect-only page is semantically ambiguous; no page-level cache directive            | Architecture                  |
| Important | app/shops/[shopId]/page.test.tsx:6-15     | `next/navigation` mock is a framework internal, not a true system boundary                                  | Test Philosophy               |
| Minor     | app/shops/[shopId]/page.test.tsx:29,43,56 | Test names are function-oriented, not user-journey framed                                                   | Architecture, Test Philosophy |
| Minor     | app/shops/[shopId]/page.test.tsx:56-68    | Missing `expect(mockNotFound).not.toHaveBeenCalled()` in null-slug fallback test                            | Bug Hunter                    |
| Minor     | app/shops/[shopId]/page.test.tsx:33,60    | Placeholder IDs (`shop-abc`, `shop-xyz`) instead of realistic UUIDs                                         | Test Philosophy               |
| Minor     | app/shops/[shopId]/page.test.tsx:3,17,21  | Explanatory comments on test setup ordering (borderline vs self-documenting standard)                       | Standards                     |
| Minor     | app/shops/[shopId]/page.test.tsx          | No test for non-404 backend error path (throws on 5xx)                                                      | Architecture                  |

### System Diagnostic

- `app/shops/[shopId]/page.test.tsx:22:30` — TypeScript: `Cannot find module './page'` — **false positive**: file exists at the correct path; transient language server issue

### Active Agents (flagged ≥1 issue)

- Bug Hunter, Standards, Architecture, Test Philosophy
- Plan Alignment: no issues found

### Validation Results

**Skipped as false positives (4):**

- Finding B (no network-error handler) — Next.js error boundary is the intended pattern; no try/catch expected in server components
- Finding E (next/navigation mock violates boundary rule) — canonical jsdom mock pattern for Next.js server components
- Finding I (explanatory comments on test setup) — comments document non-obvious Vitest hoisting ordering constraint; justified
- Finding K (TS "cannot find module './page'") — false positive; file exists at the correct path

**To fix (7 issues — 1 Important, 6 Minor/Debatable):**

- C (Important): Extract duplicate fetch logic to shared `lib/api/shops.ts`
- A (Debatable→fix): Document null-slug fallback behavior
- D (Debatable→fix): Add comment on revalidate intent
- F (Debatable→fix): Reframe test names as user journeys
- G (Minor): Add `expect(mockNotFound).not.toHaveBeenCalled()` in fallback test
- H (Minor): Replace placeholder IDs with realistic UUIDs
- J (Minor): Add test for non-404 backend error path

## Fix Pass 1

**Pre-fix SHA:** d98879ba7a52af8ac46bfbf1ef5a2f72bd4c0b8d

**Issues fixed:**

- [Important] lib/api/shops.ts (new) + [slug]/page.tsx + [shopId]/page.tsx — Extracted shared `fetchShop`; both pages import from it
- [Debatable] app/shops/[shopId]/page.tsx — Added comment explaining null-slug fallback
- [Debatable] lib/api/shops.ts — Added comment documenting 5-minute cache intent
- [Debatable] app/shops/[shopId]/page.test.tsx — Reframed all test names as user journeys
- [Minor] app/shops/[shopId]/page.test.tsx — Added `expect(mockNotFound).not.toHaveBeenCalled()` to tests
- [Minor] app/shops/[shopId]/page.test.tsx — Replaced placeholder IDs with realistic UUIDs; real Chinese shop name
- [Minor] app/shops/[shopId]/page.test.tsx — Added test for non-404 backend error path (503)

**Batch Test Run:**

- `pnpm test` — PASS (1013 tests)

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter, Architecture_
_Agents skipped (Minor-only valid findings): Standards, Test Philosophy_

### Previously Flagged Issues — Resolution Status

- [Important] page.tsx null-slug fallback — ✓ Resolved (comment added)
- [Important] Duplicate fetch logic — ✓ Resolved (shared lib/api/shops.ts)
- [Important] revalidate semantics — ✓ Resolved (comment in shared module)
- [Minor] Missing negative assertion — ✓ Resolved
- [Minor] Test names — ✓ Resolved
- [Minor] Placeholder UUIDs — ✓ Resolved
- [Minor] Missing non-404 error test — ✓ Resolved

### New Issues Found

None. No regressions.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-29-fix-dev-84-shop-card-navigation.md
