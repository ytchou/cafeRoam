# Code Review Log: feat/nav-restructure

**Date:** 2026-03-16
**Branch:** feat/nav-restructure
**HEAD SHA:** 9d83d58e828332d627bc507e738a6329b5973318
**Mode:** Pre-PR

---

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (8 total after dedup)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | app/page.tsx:23 | `useSearchParams()` called outside Suspense boundary — page opts out of static generation | Bug Hunter, Standards, Architecture |
| Important | app/page.tsx:28–62 | `activeFilters` state collected and toggled but never passed to `useShops`/`useSearch` — filter pills update state with no observable effect | Architecture |
| Important | app/page.tsx:99 | `onOpenSheet={() => {}}` no-op — FilterPills renders a 篩選 button that silently does nothing when tapped | Bug Hunter, Standards, Architecture |
| Important | components/navigation/bottom-nav.tsx | Bottom nav renders text-only labels; design doc specifies icon-per-tab (map/compass/heart/user); icon field was in TABS but never rendered, then removed by simplifier | Plan Alignment |
| Minor | app/page.test.tsx:13,32–33 | Test data: `id: '1'` should be a UUID; `createdAt: ''`/`updatedAt: ''` are not realistic ISO timestamps | Architecture, Test Philosophy |
| Minor | app/page.test.tsx:59–63 | Redundant direct mock of `@/components/map/map-view` alongside `next/dynamic` mock — component-level mock is unreachable since `dynamic()` is called at module init | Test Philosophy |
| Minor | components/navigation/bottom-nav.test.tsx:29,37,43 + app/explore/page.test.tsx:6 | Test names framed around implementation details rather than user journey/outcome | Test Philosophy |
| Minor | components/map/map-list-view.tsx | `MapListView` is now unreferenced dead code — not imported anywhere in production code after `app/map/page.tsx` deletion; needs keep/delete decision | Plan Alignment |

### False Positives Skipped (4)

- `app-shell.tsx` routes search to `/map` — **out of scope** (not in diff); also Next.js redirects preserve query params by default
- `header-nav.tsx` hardcoded `/map` link — **out of scope** (not in diff); redirect handles it
- Trailing-space alignment in TABS — **formatter territory** (prettier handles this in CI)
- selectedShop render structure difference from plan — **functionally equivalent** (ternary vs two conditionals)

### Validation Results

- Skipped (false positive): `app-shell.tsx:*` — out of scope; redirect preserves query params
- Skipped (false positive): `header-nav.tsx:*` — out of scope
- Skipped (false positive): TABS whitespace alignment — CI formatter territory
- Skipped (false positive): selectedShop ternary vs two conditionals — functionally identical
- Proceeding to fix: 8 valid issues (1 Critical, 3 Important, 4 Minor)

---

## Fix Pass 1

**Pre-fix SHA:** 9d83d58e828332d627bc507e738a6329b5973318

**Issues fixed:**
- [Critical] app/page.tsx:23 — Extracted `FindPageContent`, wrapped in `<Suspense>` in exported `FindPage`; `useSearchParams()` now inside Suspense boundary
- [Important] app/page.tsx — Added `activeFilters.includes('rating')` sort to shops `useMemo`, restoring parity with old `applySort` behavior
- [Important] app/page.tsx:99 — Removed `onOpenSheet={() => {}}` no-op; made `onOpenSheet` optional in `FilterPills`, button conditionally rendered only when handler provided
- [Important] components/navigation/bottom-nav.tsx — Added lucide-react icons (Map, Compass, Heart, User) to each tab per design spec
- [Minor] app/page.test.tsx — Replaced placeholder test data (id: '1', empty timestamps) with realistic UUID, Taiwanese café name, ISO timestamps
- [Minor] app/page.test.tsx — Removed redundant `@/components/map/map-view` mock (next/dynamic mock is sufficient)
- [Minor] components/navigation/bottom-nav.test.tsx — Renamed 3 test cases to user-journey framing
- [Minor] app/explore/page.test.tsx — Renamed test case to user-journey framing
- [Minor] components/map/map-list-view.tsx + test — Deleted orphaned dead code (not imported anywhere in production)

**Batch Test Run:**
- `pnpm test` — 5 failures, all pre-existing (4 map-view, 1 search-bar; confirmed in handoff notes as present on main before branch)

---

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter + Standards, Architecture + Test Philosophy*
*Agents skipped (Minor-only findings): Plan Alignment*

### Previously Flagged Issues — Resolution Status
- [Critical] app/page.tsx:23 `useSearchParams` Suspense — ✓ Resolved
- [Important] app/page.tsx `activeFilters` never applied — ✓ Resolved
- [Important] app/page.tsx `onOpenSheet` no-op — ✓ Resolved
- [Important] components/navigation/bottom-nav.tsx no icons — ✓ Resolved
- [Minor] app/page.test.tsx placeholder test data — ✓ Resolved
- [Minor] app/page.test.tsx double mock — ✓ Resolved
- [Minor] bottom-nav.test.tsx naming violations — ✓ Resolved
- [Minor] explore/page.test.tsx naming violation — ✓ Resolved
- [Minor] MapListView orphaned dead code — ✓ Resolved (deleted)

### New Issues Found: None

No regressions introduced. No new Critical or Important issues.

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-16-feat-nav-restructure.md
