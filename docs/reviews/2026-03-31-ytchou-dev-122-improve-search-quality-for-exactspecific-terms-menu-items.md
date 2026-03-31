# Code Review Log: ytchou/dev-122-improve-search-quality-for-exactspecific-terms-menu-items

**Date:** 2026-03-31
**Branch:** ytchou/dev-122-improve-search-quality-for-exactspecific-terms-menu-items
**Mode:** Pre-PR
**HEAD SHA:** 65e37da4bd29e63fe3fcf58970ed60d00d342502

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (10 total)

| #   | Severity  | File:Line                                                | Description                                                                                                                        | Flagged By                          |
| --- | --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Important | backend/services/search_service.py:59-88                 | Cache hit ignores query_type — keyword-boosted ranking is a no-op for warm cached queries                                          | Bug Hunter, Architecture            |
| 2   | Important | backend/services/search_service.py:152,231               | normalize_query called once per result row (N times) instead of once before the loop                                               | Bug Hunter, Standards, Architecture |
| 3   | Important | backend/core/search_vocabulary.py:95,113                 | "washed" and "sca" substring traps — misclassify unrelated queries as specialty_coffee, triggering keyword penalty with no upside  | Bug Hunter                          |
| 4   | Important | backend/workers/handlers/enrich_shop.py (untested)       | Integration test for enrich_shop.py DB write path not implemented — design doc required test_enrich_shop.py                        | Plan Alignment                      |
| 5   | Important | backend/tests/services/test_search_service.py:12-19      | reset_idf_cache fixture mutates private module state (\_IDF_CACHE, \_IDF_CACHE_AT) instead of mocking the DB boundary              | Test Philosophy                     |
| 6   | Minor     | backend/tests/services/test_search_service.py:379-442    | TestComputeKeywordScore calls private method \_compute_keyword_score directly, coupling tests to internal implementation           | Architecture, Test Philosophy       |
| 7   | Minor     | backend/core/search_vocabulary.py                        | "natural" term missing from SPECIALTY_TERMS vs. design spec                                                                        | Plan Alignment                      |
| 8   | Minor     | docs/plans/2026-03-31-search-quality-exact-terms-plan.md | Plan doc not committed to the branch                                                                                               | Plan Alignment                      |
| 9   | Minor     | backend/services/search_service.py                       | \_compute_keyword_score combines highlights + origins into single list vs. design spec's separate checks (functionally equivalent) | Plan Alignment                      |
| 10  | Minor     | backend/tests/services/test_query_classifier.py:10-55    | Six tests lack docstrings and read as input-shape descriptions rather than user outcomes                                           | Test Philosophy                     |

### Validation Results

| #   | Classification | Reason                                                                                                      |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Valid          | Cache key is (normalized, mode) only — query_type not included, confirmed in code                           |
| 2   | Valid          | normalize_query is called inside for-row loop, confirmed redundant O(n) work                                |
| 3   | Valid          | re.search uses substring match with no word boundaries — "sca" matches "escape" etc.                        |
| 4   | Valid          | test_enrich_shop.py does not exist; design doc explicitly required it                                       |
| 5   | Debatable      | IDF cache is module-level state reset (not internal mock); fixture is defensible but brittle — fix anyway   |
| 6   | Debatable      | Private method tests are brittle but test descriptions are user-framed — fix anyway                         |
| 7   | Valid          | "natural" absent from SPECIALTY_TERMS; design spec listed it explicitly                                     |
| 8   | **Incorrect**  | No project requirement to commit plan docs to feature branches — false positive                             |
| 9   | **Incorrect**  | Design spec pseudocode also uses combined list; implementation matches spec exactly — false positive        |
| 10  | Debatable      | Class-level docstring provides user framing, but per-test names are function-description style — fix anyway |

**Issues to fix:** #1, #2, #3, #4, #5, #6, #7, #10 (8 total: 5 Important, 3 Minor)
**False positives skipped:** #8 (plan doc commit), #9 (combine vs separate list)

## Fix Pass 1

**Pre-fix SHA:** 65e37da4bd29e63fe3fcf58970ed60d00d342502
**Post-fix SHA:** dff5210b38db9fd09cb768d1044abc599222eb40

**Issues fixed:**

- [Important #1] query_normalizer.py + search_service.py — `hash_cache_key` now includes `query_type`; prevents scoring collision on warm cache
- [Important #2] search_service.py — `normalize_query` hoisted before the result-row loop; `_compute_keyword_score` accepts pre-normalized string
- [Important #3] search_vocabulary.py — removed "washed" (replaced with "washed process") and "sca"; both were substring traps
- [Important #4] test_handlers.py — added `test_menu_highlights_and_coffee_origins_written_to_db` to `TestEnrichShopHandler`
- [Important #5] search_service.py + test_search_service.py — added `SearchService._clear_idf_cache()`; fixture uses class method instead of direct module variable access
- [Minor #6] test_search_service.py — removed `TestComputeKeywordScore`; added 4 behavioral tests to `TestOptionCPlusScoring` via public `search()`
- [Minor #7] search_vocabulary.py — added `"natural"` term per design spec
- [Minor #10] test_query_classifier.py — added docstrings to 6 tests

**Additional fix (test failure from fix #6):**

- search_service.py — added `menu_highlights`/`coffee_origins` to `_SHOP_FIELDS_HANDLED_SEPARATELY`; coerce `None` → `[]` to prevent Pydantic crash when DB columns are NULL

**Batch Test Run:**

- `pnpm test` — PASS (pre-existing failure in generateShopFaq.test.ts on main too — unrelated to this branch)
- `cd backend && uv run pytest` — PASS (748 passed, 0 failed)

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy_

### Previously Flagged Issues — Resolution Status

- [Important #1] cache hit ignores query_type — ✓ Resolved
- [Important #2] normalize_query per row — ✓ Resolved
- [Important #3] "washed"/"sca" substring traps — ✓ Resolved
- [Important #4] missing enrich_shop test — ✓ Resolved
- [Important #5] fixture mutates private module state — ✓ Resolved
- [Minor #6] TestComputeKeywordScore calls private method — ✓ Resolved
- [Minor #7] "natural" missing from SPECIALTY_TERMS — ✓ Resolved
- [Minor #10] naming violations in test_query_classifier.py — ✓ Resolved

### New Issues Found (1)

| Severity | File:Line                                   | Description                                                                                           | Flagged By   |
| -------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| Minor    | backend/services/search_service.py:~170-176 | `_clear_idf_cache` exposes test-only infrastructure as a public static method on the production class | Architecture |

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**

- [Minor] `SearchService._clear_idf_cache()` is a test-only helper on the production class — acceptable trade-off for test isolation; alternative would be moving IDF cache to instance level (deferred)
