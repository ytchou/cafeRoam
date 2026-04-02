# Code Review Log: feat/admin-dashboard-hardening

**Date:** 2026-04-02
**Branch:** feat/admin-dashboard-hardening
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (20 total)

| #   | Severity  | File:Line                                                    | Description                                                                                   | Flagged By                               |
| --- | --------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Critical  | `app/(admin)/admin/roles/page.tsx:79`                        | `user_identifier` sent to backend which expects `user_id` — grant always 422s                 | Bug Hunter, Standards, Architecture      |
| 2   | Critical  | `app/(admin)/admin/roles/page.tsx:71-98`                     | `handleGrant` + `handleRevoke` have no `res.ok` check, no toast — failures invisible          | Bug Hunter, Standards, Architecture      |
| 3   | Critical  | `app/(admin)/admin/roles/page.tsx:22,153`                    | `RoleGrant.created_at` vs backend `granted_at` — Granted column shows "Invalid Date"          | Bug Hunter, Standards, Architecture      |
| 4   | Critical  | `app/(admin)/admin/roles/page.tsx:116,191,207`               | `focus:outline-none` without `focus-visible:ring` replacement on form inputs                  | Design Quality                           |
| 5   | Important | `app/(admin)/admin/page.tsx:520`                             | `fetchClaims` called without `claimStatusFilter` after rejection — list resets to pending     | Bug Hunter, Architecture                 |
| 6   | Important | `app/(admin)/admin/_components/ConfirmDialog.tsx:45-49`      | Dialog always closes even when `onConfirm` throws — design doc says stay open on error        | Bug Hunter, Plan Alignment, Architecture |
| 7   | Important | `app/(admin)/admin/roles/page.tsx:39-51`                     | `fetchRoles` has no error state — user sees blank table on API failure                        | Bug Hunter                               |
| 8   | Important | `backend/tests/api/test_admin_roles.py:130-154`              | Email-resolution JOIN not covered in tests; `auth_users` key absent from mock data            | Bug Hunter, Plan Alignment               |
| 9   | Important | `backend/tests/api/test_admin_roles.py:24-178`               | Tests mock internal `get_admin_db` instead of network/HTTP boundary                           | Test Philosophy                          |
| 10  | Important | `app/(admin)/admin/page.tsx:420-424`                         | Status badge uses color as sole information carrier (red/green, no icon)                      | Design Quality                           |
| 11  | Important | `app/(admin)/layout.tsx:91-99`                               | Nav `<Link>` elements have no explicit `focus-visible:ring-*` class                           | Design Quality                           |
| 12  | Minor     | `app/api/admin/pipeline/dead-letter/route.ts:4-6`            | 3-line comment violates minimal-comments CLAUDE.md rule                                       | Standards                                |
| 13  | Minor     | `backend/tests/api/test_admin_roles.py:183-191`              | Tests import `_VALID_ROLES` directly — tests implementation not behavior                      | Architecture, Test Philosophy            |
| 14  | Minor     | `backend/tests/api/test_admin_roles.py:22,73,93`             | Test names use HTTP status codes not user actions/outcomes                                    | Test Philosophy                          |
| 15  | Minor     | `app/(admin)/admin/roles/page.test.tsx:36-37`                | Placeholder emails `@test.com` instead of realistic test data                                 | Test Philosophy                          |
| 16  | Minor     | `app/(admin)/admin/_components/ConfirmDialog.test.tsx:16,48` | Test names framed around rendering mechanics, not user actions                                | Test Philosophy                          |
| 17  | Minor     | Multiple admin pages                                         | Inconsistent border-radius (`rounded`, `rounded-md`, `rounded-lg`) across same component type | Design Quality                           |
| 18  | Minor     | `app/(admin)/admin/roles/page.tsx:116`                       | `py-1.5` (6px) not on 4pt spacing scale                                                       | Design Quality                           |
| 19  | Minor     | `app/(admin)/admin/_components/ConfirmDialog.tsx:53`         | Destructive variant uses raw `bg-red-600` instead of shadcn `variant="destructive"`           | Design Quality                           |
| 20  | Minor     | `app/(admin)/admin/shops/page.tsx:125`                       | `REGIONS[0].value` — unsafe `[0]` array indexing (pre-existing in modified file)              | Standards                                |

### Validation Results

**Skipped (7 false positives):**

- Issue 4 (`roles/page.tsx:116,191,207`): `focus:ring-2` IS present — ring is not missing
- Issue 9 (`test_admin_roles.py`): `app.dependency_overrides` IS the DB boundary per FastAPI pattern + CLAUDE.md
- Issue 10 (`admin/page.tsx:420-424`): `{claim.status}` text rendered — color is additive, not sole carrier
- Issue 12 (`dead-letter/route.ts:4-7`): No minimal-comments rule in CLAUDE.md; comment is valid context
- Issue 17 (multiple files): No file:line, no project rule on border-radius
- Issue 18 (`roles/page.tsx:116`): `py-1.5` is standard Tailwind; no 4pt scale constraint in CLAUDE.md
- Issue 20 (`shops/page.tsx:125`): `REGIONS[0].value` is safe with single-element const array

**13 issues to fix:** 3 Critical, 5 Important, 5 Minor

---

## Fix Pass 1

**Pre-fix SHA:** 6657a3aa158e10ec8c2df2059c234f0cd8458b89

**Issues fixed:**

- [Critical] `roles/page.tsx:79` — Renamed `user_identifier` → `user_id` in grant request body to match backend `GrantRoleRequest`
- [Critical] `roles/page.tsx:71-98` — Added `toast` import + `res.ok` check + `try/finally` in `handleGrant` and `handleRevoke`; error state on `fetchRoles` failure
- [Critical] `roles/page.tsx:22,153` — Fixed `RoleGrant` interface: `created_at` → `granted_at`; updated table render + test fixtures
- [Important] `admin/page.tsx:520` — Changed `fetchClaims(tokenRef.current)` → `fetchClaims(tokenRef.current, claimStatusFilter)`
- [Important] `ConfirmDialog.tsx:45-49` — Wrapped `await onConfirm()` in `try/catch`; dialog only closes on success
- [Important] `roles/page.tsx:39-51` — Added `error` state + `setError` + inline error `<p role="alert">` on fetch failure
- [Important] `backend/tests/api/test_admin_roles.py:132-154` — Added `auth_users` JOIN data to list_roles mocks; assert email resolution + no raw `auth_users` leakage
- [Important] `layout.tsx:91-99` — Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400` to nav links
- [Minor] `backend/tests/api/test_admin_roles.py:183-191` — Removed `_VALID_ROLES` import tests; renamed HTTP-code test names to user-outcome framing
- [Minor] `roles/page.test.tsx:36-37` — Replaced `@test.com` placeholder emails with realistic values; updated `created_at` → `granted_at` in fixtures
- [Minor] `ConfirmDialog.test.tsx:16,48` — Renamed test names from rendering mechanics to user-outcome framing
- [Minor] `ConfirmDialog.tsx:53` — Replaced raw `bg-red-600` with `cn(buttonVariants({ variant: 'destructive' }))`

**Batch Test Run:**

- `npx vitest run` — 1084 PASS, 5 FAIL (all pre-existing, confirmed on main)
- `uv run pytest tests/` — 787 PASS, 0 FAIL

**Re-verify findings:** 1 regression found (see Pass 2)

---

## Fix Pass 2

**Pre-fix SHA:** cb73ec15 (after Pass 1 commit)

**Regression fixed:**

- [Important] `roles/page.tsx:102-120` — `handleRevoke` returned normally on error; `ConfirmDialog` treated it as success and closed. Fixed: now throws after `toast.error`; `ConfirmDialog` catch stays silent (no double-toast) and dialog remains open for retry.

**Batch Test Run:**

- `npx vitest run` (targeted: roles + ConfirmDialog tests) — 10 PASS, 0 FAIL

**Re-verify: Clean — no Critical or Important issues remain. Early exit.**

---

## Final State

**Iterations completed:** 2
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-02-feat-admin-dashboard-hardening.md
