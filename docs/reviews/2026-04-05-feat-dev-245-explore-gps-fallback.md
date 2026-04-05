# Code Review Log: feat/dev-245-explore-gps-fallback

**Date:** 2026-04-05
**Branch:** feat/dev-245-explore-gps-fallback
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (3 total)

| Severity  | File:Line                  | Description                                                                                                                                                                                                                                                                                  | Flagged By                 |
| --------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Important | app/explore/page.tsx:147   | `TarotEmptyState` rendered without `onTryDifferentDistrict` prop — the component supports it but ExplorePage never wires it. Plan Task 6 and design doc both specify this CTA should appear in district mode.                                                                                | Plan Alignment, Bug Hunter |
| Important | app/explore/page.tsx:62-67 | Analytics `tarot_draw_loaded` event only fires when `latitude && longitude` are truthy. District-mode draws (where lat/lng are null) are never tracked, creating a blind spot in analytics.                                                                                                  | Architecture & Design      |
| Minor     | app/explore/page.tsx:147   | `TarotEmptyState` shows "Expand radius" in district mode, where `radius_km` has no effect on the district query. Without the missing `onTryDifferentDistrict` CTA, the only action available to users in district mode is meaningless. Resolving the Important finding above would fix this. | Architecture & Design      |

### Validation Results

| Finding                                      | Verdict       | Rationale                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing `onTryDifferentDistrict` wiring      | **Valid**     | The prop exists on `TarotEmptyState`, the plan explicitly calls for it, the design doc specifies it, but `ExplorePage` line 147 renders `<TarotEmptyState onExpandRadius={handleExpandRadius} />` without the district callback. This is incomplete implementation.                       |
| Analytics blind spot for district draws      | **Valid**     | Line 62: `if (cards.length > 0 && latitude && longitude)` — when district mode is active, `latitude` and `longitude` are null (effectiveLat/effectiveLng flow), so the analytics event never fires for district-based draws. The condition should also account for `effectiveDistrictId`. |
| "Expand radius" meaningless in district mode | **Debatable** | This is a consequence of the missing `onTryDifferentDistrict`. Once that's wired, "Expand radius" becomes a secondary option (per design), though it still has no effect in district mode. Fixing the Important finding partially addresses this.                                         |

## Fix Pass 1

**Pre-fix SHA:** 84869360370ce933fc04d81c213af8470181fb78

**Issues fixed:**

- [Important] app/explore/page.tsx:147 — Wired `onTryDifferentDistrict` prop to `TarotEmptyState` when `effectiveDistrictId` is set; callback calls `setSelectedDistrictId(null)`. Also made `onExpandRadius` optional in `TarotEmptyStateProps`. New tests added to `page.test.tsx` covering district-mode empty state rendering.
- [Important] app/explore/page.tsx:62-67 — Fixed analytics blind spot: `tarot_draw_loaded` condition updated to `(latitude && longitude || effectiveDistrictId)` so district-mode draws are tracked. Added `effectiveDistrictId` to the `useEffect` dependency array.
- [Minor] app/explore/page.tsx:147 — Hidden "Expand radius" CTA in district mode by passing `onExpandRadius={undefined}` when `effectiveDistrictId` is set.

**Issues skipped (false positives):** (none)

**Batch Test Run:**

- `pnpm test` — PASS (1198 tests, 219 test files)

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Plan Alignment, Architecture & Design_
_Agents skipped (no findings): (none)_
_Agents skipped (Minor-only): (none)_

### Previously Flagged Issues — Resolution Status

- [Important] app/explore/page.tsx:147 — ✓ Resolved
  `onTryDifferentDistrict={effectiveDistrictId ? handleTryDifferentDistrict : undefined}` is now wired at line 153. `handleTryDifferentDistrict` calls `setSelectedDistrictId(null)`, correctly resetting to the auto-fallback district. TarotEmptyState renders the "Try a different district" button when the prop is provided. A covering integration test was added in page.test.tsx.

- [Important] app/explore/page.tsx:62-67 — ✓ Resolved
  The analytics condition is now `cards.length > 0 && (latitude && longitude || effectiveDistrictId)`. Operator precedence is correct (`&&` binds tighter). The dependency array also adds `effectiveDistrictId`. District-mode draws now fire `tarot_draw_loaded`.

- [Minor] app/explore/page.tsx:147 — ✓ Resolved
  `onExpandRadius={effectiveDistrictId ? undefined : handleExpandRadius}` ensures "Expand radius" is hidden in district mode.

### New Issues Found (0)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** (none)

**Review log:** docs/reviews/2026-04-05-feat-dev-245-explore-gps-fallback.md
