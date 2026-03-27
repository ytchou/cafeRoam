# Code Review Log: fix/dev-64-cancel-deletion-500

**Date:** 2026-03-27
**Branch:** fix/dev-64-cancel-deletion-500
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (11 total)

| Severity  | File:Line                                 | Description                                                                                                                                 | Flagged By                   |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Important | app/account/recover/page.tsx:40-51        | `refreshSession` error not captured; failed refresh silently navigates to `/` leaving user in broken state                                  | Bug Hunter                   |
| Important | backend/api/auth.py:32                    | `record_consent` admin SDK call unguarded — PR wrapped delete/cancel-deletion but missed this identical call                                | Bug Hunter                   |
| Important | backend/api/deps.py:103-137               | `get_current_user_allow_pending` duplicates JWT validation logic verbatim from `get_current_user`; third copy exists in `get_optional_user` | Standards, Architecture      |
| Important | backend/api/auth.py:78,119                | `user_id` missing from structlog warning calls; `except Exception` too broad — masks programmer errors                                      | Architecture, Plan Alignment |
| Minor     | components/cookie-consent-banner.tsx:11   | `eslint-disable-next-line react-hooks/set-state-in-effect` references non-existent rule — silences nothing, misleads readers                | Bug Hunter, Standards        |
| Minor     | app/(protected)/settings/page.tsx:75      | `console.warn` in production code — SDK error message visible in browser DevTools                                                           | Standards                    |
| Minor     | backend/tests/api/test_auth_routes.py:97  | Mock admin_db retrieved via side-effect of calling override lambda — fragile if `_auth_overrides` shape changes                             | Architecture                 |
| Minor     | app/account/recover/page.tsx:51           | `window.location.assign('/')` inconsistent with `settings/page.tsx` `router.push`; comment doesn't explain redirect-loop risk               | Architecture                 |
| Minor     | backend/tests/api/test_auth_routes.py:90  | Test name `test_delete_account_succeeds_when_metadata_service_is_unavailable` frames around infra condition not user outcome                | Test Philosophy              |
| Minor     | backend/tests/api/test_auth_routes.py:188 | Test name `test_cancel_deletion_succeeds_when_metadata_service_is_unavailable` — same naming pattern                                        | Test Philosophy              |
| Minor     | app/account/recover/page.test.tsx:71      | `'shows guidance when JWT is stale after cancel deletion'` — "JWT is stale" is implementation detail, not user-visible outcome              | Test Philosophy              |

_Note: `middleware.ts` flagged by Architecture agent — excluded (file not in diff, out of scope)._
_Note: `e2e/fixtures/auth.ts` addInitScript timing flagged by Bug Hunter — excluded (probe page only reads URL, no practical impact)._

### Validation Results

| #                                             | Classification | Reason                                                                                       |
| --------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| 1 — recover/page.tsx refresh error            | **Incorrect**  | Refresh failure produces `null` data, not stale truthy data — redirect is safe               |
| 2 — auth.py record_consent unguarded          | **Valid**      | Real omission; delete/cancel both guarded, consent is not                                    |
| 3 — deps.py JWT validation duplicated         | **Debatable**  | Real duplication, intentional design boundary; fix anyway (lean conservative)                |
| 4 — auth.py user_id missing, broad except     | **Incorrect**  | `user_id` omission is explicit PDPA compliance decision (commit `fix(review): omit user_id`) |
| 5 — cookie-consent-banner ESLint rule         | **Incorrect**  | Rule `set-state-in-effect` exists in `eslint-plugin-react-hooks@7.0.1`                       |
| 6 — settings/page.tsx console.warn            | **Debatable**  | Intentional diagnostic for non-fatal path; fix anyway                                        |
| 7 — test_auth_routes mock retrieval           | **Incorrect**  | Lambda captures same instance router handler receives — pattern is correct                   |
| 8 — recover/page.tsx window.location.assign   | **Valid**      | Missing comment explaining intentional hard-nav rationale                                    |
| 9 — test name (delete, metadata unavailable)  | **Debatable**  | Violates CLAUDE.md user-outcome naming; fix anyway                                           |
| 10 — test name (cancel, metadata unavailable) | **Debatable**  | Same as #9                                                                                   |
| 11 — test name "JWT is stale"                 | **Valid**      | Directly violates CLAUDE.md user-outcome test naming standard                                |

**Skipped (Incorrect):** Issues 1, 4, 5, 7 (4 false positives)

**To fix (7 issues):** Issues 2, 3 (Important), 6, 8, 9, 10, 11 (Minor)

## Fix Pass 1

**Pre-fix SHA:** d5f207c544007e06262d0c90b9f79bf138350b82
**Post-fix SHA:** 3df29b899d9ea13e928269e8d309edf5972e6cf2

**Issues fixed:**

- [Important] backend/api/auth.py:32 — Wrapped record_consent admin SDK call in try/except with structlog warning
- [Important] backend/api/deps.py:103-137 — Extracted `_decode_jwt_user_id()` helper; get_current_user, get_current_user_allow_pending, and get_optional_user all delegate to it
- [Minor] app/(protected)/settings/page.tsx:75 — Removed console.warn; replaced with comment explaining non-fatal path
- [Minor] app/account/recover/page.tsx:51 — Added comment explaining why window.location.assign is used instead of router.push
- [Minor] backend/tests/api/test_auth_routes.py:90 — Renamed to `test_delete_account_still_returns_200_when_admin_metadata_sync_fails`
- [Minor] backend/tests/api/test_auth_routes.py:188 — Renamed to `test_cancel_deletion_still_returns_200_when_admin_metadata_sync_fails`
- [Minor] app/account/recover/page.test.tsx:71 — Renamed to `'shows recovery guidance if account still appears pending after cancellation'`

**Batch Test Run:**

- `pnpm test` — PASS (948/948)
- `cd backend && uv run pytest` — PASS (661/661)

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy_
_Skipped: none (all agents flagged ≥1 issue in previous pass)_

### Previously Flagged Issues — Resolution Status

- [Important] backend/api/auth.py:32 — ✓ Resolved
- [Important] backend/api/deps.py:103-137 — ✓ Resolved
- [Minor] app/(protected)/settings/page.tsx:75 — ✓ Resolved
- [Minor] app/account/recover/page.tsx:51 — ✓ Resolved
- [Minor] backend/tests/api/test_auth_routes.py:90 — ✓ Resolved
- [Minor] backend/tests/api/test_auth_routes.py:188 — ✓ Resolved
- [Minor] app/account/recover/page.test.tsx:71 — ✓ Resolved

### New Issues Found

None.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-27-fix-dev-64-cancel-deletion-500.md
