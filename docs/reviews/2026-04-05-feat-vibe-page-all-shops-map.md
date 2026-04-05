# Code Review Log: feat/vibe-page-all-shops-map

**Date:** 2026-04-05
**Branch:** feat/vibe-page-all-shops-map
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (5 total)

| Severity  | File:Line                                 | Description                                                                                                     | Flagged By                 |
| --------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Important | app/explore/vibes/[slug]/page.tsx:168     | districts prop hardcoded as `[]` — useDistricts hook exists but is not wired up, so district chips never render | Plan Alignment, Bug Hunter |
| Important | app/explore/vibes/[slug]/page.tsx:188-251 | Bidirectional map-list sync incomplete — shop cards have no onClick to highlight corresponding map pin          | Plan Alignment, Bug Hunter |
| Important | app/explore/vibes/[slug]/page.tsx:116-121 | mapShops array constructed in render body without useMemo — violates CLAUDE.md performance standards            | Standards, Architecture    |
| Important | components/explore/district-chips.tsx:79  | Active chip uses bg-amber-800 (#92400e) instead of DESIGN.md Espresso #2c1810                                   | Design Quality             |
| Minor     | app/explore/vibes/[slug]/page.tsx:109-111 | subtitleChips computed in render body without memoization                                                       | Standards                  |

### Validation Results

| Finding                    | Verdict   | Evidence                                                                                                                                                                                     |
| -------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| districts=[] hardcoded     | Valid     | `useDistricts` hook at `lib/hooks/use-districts.ts` exists and returns districts from API. Acceptance criteria explicitly requires district chip filtering.                                  |
| Missing card-to-pin sync   | Valid     | `setSelectedShopId` only called in `handlePinClick` (pin->card). No onClick handler on `<li>` items. Acceptance criteria: "Tapping a shop card highlights the corresponding pin on the map." |
| mapShops without useMemo   | Valid     | Line 116-121 creates new array every render. `MapView` receives it as prop, triggering unnecessary re-renders including GeoJSON recomputation. CLAUDE.md rule is explicit.                   |
| Wrong active chip color    | Valid     | DESIGN.md: "Active: Background #2c1810 (espresso), text white" for mode chips. Same styling applies to filter chips per design system. amber-800 is #92400e, not espresso.                   |
| subtitleChips without memo | Debatable | Simple string split, no child component receives it as a prop-affecting reference. Low impact but technically violates the same CLAUDE.md rule.                                              |

### Skipped (False Positives)

| File:Line                                       | Reason                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| backend/api/explore.py:46                       | district_id has no UUID validation, but matches existing param patterns; Supabase parameterized query prevents injection |
| components/explore/district-chips.tsx:32        | scrollbar-hide class used by multiple existing components — established codebase pattern                                 |
| backend/tests/services/test_vibe_service.py:224 | [0] indexing in test assertions is idiomatic; first() helper rule targets business logic                                 |

## Fix Pass 1

**Pre-fix SHA:** 6bbe605d1f0ea2dd2a40b5e62009f80ff0035110
**Issues fixed:**

- [Important] components/explore/district-chips.tsx:79 — replaced bg-amber-800 with bg-[#2c1810] (Espresso from DESIGN.md)
- [Important] app/explore/vibes/[slug]/page.tsx:168 — imported useDistricts, wired up districts prop, added test
- [Important] app/explore/vibes/[slug]/page.tsx:188-251 — added onClick={() => setSelectedShopId(shop.shopId)} on shop cards, added test
- [Important] app/explore/vibes/[slug]/page.tsx:116-121 — wrapped mapShops in useMemo([response])
- [Minor] app/explore/vibes/[slug]/page.tsx:109-111 — wrapped subtitleChips in useMemo([response])

**Batch Test Run:**

- `pnpm test` — PASS (3 flaky timeout failures in unrelated admin test file; confirmed pre-existing, pass in isolation)
- `cd backend && uv run pytest` — PASS (854 passed)

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Design Quality_
_Agents skipped (no findings): none_
_Agents skipped (Minor-only): none_

### Previously Flagged Issues — Resolution Status

- [Important] app/explore/vibes/[slug]/page.tsx:168 — ✓ Resolved (useDistricts wired up, districts passed to DistrictChips)
- [Important] app/explore/vibes/[slug]/page.tsx:188-251 — ✓ Resolved (onClick added to shop cards)
- [Important] app/explore/vibes/[slug]/page.tsx:116-121 — ✓ Resolved (mapShops wrapped in useMemo)
- [Important] components/explore/district-chips.tsx:79 — ✓ Resolved (bg-[#2c1810] applied)
- [Minor] app/explore/vibes/[slug]/page.tsx:109-111 — ✓ Resolved (subtitleChips wrapped in useMemo)

### New Issues Found (0)

No regressions introduced.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-05-feat-vibe-page-all-shops-map.md
