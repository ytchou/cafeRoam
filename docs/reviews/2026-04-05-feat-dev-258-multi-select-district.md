# Code Review Log: feat/dev-258-multi-select-district

**Date:** 2026-04-05
**Branch:** feat/dev-258-multi-select-district
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)_

### Issues Found (6 total)

| Severity  | File:Line                                        | Description                                                                                                                                   | Flagged By                        |
| --------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Important | app/explore/page.tsx:48-74                       | effectiveDistrictIds creates new array ref every render; useEffect dep array fires analytics capture on every re-render when districts active | Bug Hunter, Architecture & Design |
| Important | app/explore/page.tsx:40-45                       | activeDistrictIds not wrapped in useMemo; violates CLAUDE.md "no inline object/array in render without useMemo"                               | Standards & Conventions           |
| Important | components/explore/district-chips.test.tsx:1-107 | Duplicate test file — same component tested in both district-chips.test.tsx and **tests**/district-chips.test.tsx                             | Architecture & Design             |
| Minor     | app/explore/page.tsx:43                          | districts[0] unsafe indexing (CLAUDE.md rule), though runtime-safe due to guard                                                               | Standards & Conventions           |
| Minor     | backend/services/tarot_service.py:88             | Docstring still says singular "district"; should reflect multi-district                                                                       | Plan Alignment                    |
| Minor     | app/explore/page.tsx:83-85                       | handleTryDifferentDistrict name is misleading — clears all districts, not "tries different"                                                   | Architecture & Design             |

### Validation Results

| Finding                           | Verdict       | Notes                                                                                   |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| effectiveDistrictIds unstable ref | **Valid**     | Array identity changes every render; useEffect will fire repeatedly, spamming analytics |
| activeDistrictIds not memoized    | **Valid**     | CLAUDE.md explicitly requires useMemo for inline arrays in render                       |
| Duplicate test file               | **Valid**     | Two separate test files for the same component is clearly unintentional                 |
| districts[0] indexing             | **Debatable** | Guarded by truthiness check, but CLAUDE.md says use first() helper; fix anyway          |
| Docstring singular                | **Debatable** | Minor accuracy issue; fix anyway                                                        |
| handleTryDifferentDistrict naming | **Debatable** | Name inherited from pre-existing code; rename would improve clarity                     |

### Skipped (False Positives)

- **district-picker.tsx:53** — `selectedDistrictIds.includes()` is O(n) but district count is tiny (10-20); Set pre-index would be over-engineering
- **lib/api/vibes.ts:30** — district_ids appended via string concat instead of URLSearchParams; values are safe UUIDs, no encoding needed
- **backend/api/explore.py:26** — Duplicate comma-split parsing pattern; 1-line idiom, DRY extraction not worth the indirection

## Fix Pass 1

**Pre-fix SHA:** 488aef78bf64472462b105862247b8406afacf27

**Issues fixed:**

- [Important] app/explore/page.tsx:40-45 — Wrapped activeDistrictIds in useMemo with [selectedDistrictIds, gpsAvailable, firstDistrict] deps; used array destructuring `const [firstDistrict] = districts` safe pattern
- [Important] app/explore/page.tsx:48-49 — Wrapped effectiveDistrictIds in useMemo with [isNearMeMode, activeDistrictIds] deps
- [Important] app/explore/page.tsx:74 — Replaced effectiveDistrictIds array reference in useEffect dep array with stable primitive `effectiveDistrictKey`
- [Important] components/explore/district-chips.test.tsx — Confirmed **tests**/ missing 5 unique tests; merged into **tests**/district-chips.test.tsx; deleted root-level duplicate via git rm
- [Minor] app/explore/page.tsx:83-85 — Renamed handleTryDifferentDistrict → handleClearDistricts and updated usage in JSX
- [Minor] backend/services/tarot_service.py:89 — Updated docstring to reflect multi-district signature

**Batch Test Run:**

- `pnpm test` — PASS (1222 tests, 222 files; -2 from duplicate test consolidation)
- `cd backend && uv run pytest` — PASS (849 tests)

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment_
_Agents skipped: none_

### Previously Flagged Issues — Resolution Status

- [Important] app/explore/page.tsx:48-74 — ✓ Resolved
  effectiveDistrictIds wrapped in useMemo (lines 52-55); analytics useEffect now depends on effectiveDistrictKey (primitive string) — no more array reference instability.

- [Important] app/explore/page.tsx:40-45 — ✓ Resolved
  activeDistrictIds now wrapped in useMemo (lines 41-49) with correct deps [selectedDistrictIds, gpsAvailable, firstDistrict].

- [Important] components/explore/district-chips.test.tsx:1-107 — ✓ Resolved
  Duplicate file deleted. Only components/explore/**tests**/district-chips.test.tsx remains (163 lines, expanded with multi-select tests).

- [Minor] app/explore/page.tsx:43 — ✓ Resolved
  Replaced districts[0] unsafe indexing with safe destructuring `const [firstDistrict] = districts`.

- [Minor] backend/services/tarot_service.py:88 — ✓ Resolved
  Docstring updated to "Query shops within one or more districts using FK filter."

- [Minor] app/explore/page.tsx:83-85 — ✓ Resolved
  Renamed handleTryDifferentDistrict → handleClearDistricts at both the definition (line 89) and JSX call site (line 184).

### New Issues Found (0)

| Severity | File:Line | Description   | Flagged By |
| -------- | --------- | ------------- | ---------- |
| —        | —         | No new issues | —          |

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-05-feat-dev-258-multi-select-district.md
