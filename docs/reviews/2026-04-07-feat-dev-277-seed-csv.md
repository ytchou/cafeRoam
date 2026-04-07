# Code Review Log: feat/dev-277-seed-csv

**Date:** 2026-04-07
**Branch:** feat/dev-277-seed-csv
**Mode:** Pre-PR

## Pass 1 -- Full Discovery

*Agents: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Test Philosophy*

### Issues Found (6 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | backend/api/admin_shops.py:163 | `result.is_valid` should be `result.passed` -- `FilterResult` has attribute `passed`, not `is_valid`. Will raise `AttributeError` at runtime on every CSV upload. | Bug Hunter |
| Important | backend/api/admin.py:550-557 | `run_pipeline_batch` endpoint missing `log_admin_action` call. Every other admin endpoint in the file has an audit trail entry. | Standards & Conventions |
| Important | backend/api/admin_shops.py:209 | `log_admin_action` is only called inside `if candidates:` block. If all CSV rows have invalid URLs, the admin action goes unaudited. Move audit logging outside the conditional. | Bug Hunter |
| Important | backend/tests/api/test_admin_shops_import.py | No tests for the new `import_manual_csv` endpoint. Old tests for `import_cafe_nomad` and `trigger_url_check` were deleted but no replacement tests added. CLAUDE.md requires tests for "all API route handlers". | Plan Alignment, Test Philosophy |
| Minor | app/(admin)/admin/shops/_components/ImportSection.tsx:7-12 | `CsvSummary` interface missing `duplicate_in_file` field that the backend returns. The value is silently dropped. Consider adding it to keep the UI honest about the full breakdown. | Architecture & Design |
| Minor | backend/scripts/seed_shops_csv.py:45-47 | No batching for the `.in_()` query on `candidate_urls`. If the CSV has thousands of rows, this single query could hit Supabase/PostgREST URL length limits. The API endpoint has the same pattern. Low risk for current usage but worth noting. | Architecture & Design |

### Validation Results

| File:Line | Status | Notes |
|-----------|--------|-------|
| backend/api/admin_shops.py:163 | Valid | Confirmed: `FilterResult.passed` is the attribute; `.is_valid` does not exist. Runtime crash guaranteed. |
| backend/api/admin.py:550-557 | Valid | Pattern is consistent -- all other admin endpoints call `log_admin_action`. Omission is clearly unintentional. |
| backend/api/admin_shops.py:209 | Valid | The conditional skip is real -- zero-valid-row uploads go unlogged. |
| backend/tests/api/test_admin_shops_import.py | Valid | CLAUDE.md explicitly requires tests for all API route handlers. The new endpoint has none. |
| ImportSection.tsx:7-12 | Debatable | Backend returns the field, frontend ignores it. Not a bug, but a minor data display gap. Fix anyway for completeness. |
| seed_shops_csv.py:45-47 | Debatable | Unlikely to hit in practice (admin CSV uploads are small), but the pattern is flagged for awareness. Fix anyway (lean conservative). |

## Fix Pass 1
**Pre-fix SHA:** c655e468f8165aa0cf31ef0e752eed331fca279f
**Issues fixed:**
- [Critical] backend/api/admin_shops.py:163 — `result.is_valid` → `result.passed` (AttributeError on every CSV upload)
- [Important] backend/api/admin.py:550-557 — Added `log_admin_action` to `run_pipeline_batch` for audit trail
- [Important] backend/api/admin_shops.py:209 — Moved `log_admin_action` outside `if candidates:` block so all-invalid-URL uploads are audited
- [Important] backend/tests/api/test_admin_shops_import.py — Added `TestImportManualCsv` with 6 journey-framed tests (all green)
- [Minor] app/(admin)/admin/shops/_components/ImportSection.tsx — Added `duplicate_in_file` to `CsvSummary` interface + display line
**Issues skipped (debatable/low-risk):**
- backend/scripts/seed_shops_csv.py:45-47 — `.in_()` batching; low-risk at current volumes

**Batch Test Run:**
- `pnpm test` — PASS (1236/1236)
- `cd backend && uv run pytest` — PASS (893/893)

**Additional fixes (Pyright diagnostics):**
- Removed unused `_admin_patches` dead code with invalid `patch()` kwargs
- Fixed `-> "Any"` string annotation → `-> Any` in test file
- Fixed test mock response missing `duplicate_in_file` field + updated label assertion

## Pass 2 — Re-Verify
*Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Test Philosophy*

### Previously Flagged Issues — Resolution Status
- [Critical] backend/api/admin_shops.py:163 — ✓ Resolved
- [Important] backend/api/admin.py:550-557 — ✓ Resolved
- [Important] backend/api/admin_shops.py:209 — ✓ Resolved
- [Important] backend/tests/api/test_admin_shops_import.py — ✓ Resolved
- [Minor] app/(admin)/admin/shops/_components/ImportSection.tsx:7-12 — ✓ Resolved
- [Minor] backend/scripts/seed_shops_csv.py:45-47 — Not addressed (debatable, deferred)

### New Issues Found (0)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**
- [Minor] backend/scripts/seed_shops_csv.py:45-47 — `.in_()` query not batched for large CSVs (low risk at current usage volumes, deferred)

**Review log:** docs/reviews/2026-04-07-feat-dev-277-seed-csv.md
