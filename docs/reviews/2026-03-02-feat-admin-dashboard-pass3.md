# Code Review Log: feat/admin-dashboard (Pass 3)

**Date:** 2026-03-02
**Branch:** feat/admin-dashboard
**HEAD:** 079e97672ffd1b9eda999b4dae0f8430f3e1a82a
**Mode:** Post-PR (#15)
**Prior reviews:** docs/reviews/2026-03-02-feat-admin-dashboard-pass2.md (all resolved)

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Opus), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Gemini (cross-review)_

### Issues Found (24 total)

| #   | Severity  | File:Line                                                       | Description                                                                                                                                   | Flagged By              |
| --- | --------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| C1  | Critical  | `supabase/migrations/20260302000002...sql:3-4`                  | `CREATE OR REPLACE FUNCTION shop_tag_counts()` changes return type — PostgreSQL forbids this; migration will fail at deployment                | Bug Hunter              |
| C2  | Critical  | `backend/api/admin.py:138-171`                                  | `reject_submission` lacks status guard — can reject a `live` submission and delete the associated live shop (data loss)                        | Bug Hunter              |
| I1  | Important | `backend/api/admin.py:70-98`                                    | `retry_job` unconditional update after status check — TOCTOU race; should use conditional `.in_()` like `cancel_job` does                     | Bug Hunter              |
| I2  | Important | `backend/api/admin.py:101-135`                                  | `approve_submission` unconditional update after status check — same TOCTOU pattern                                                            | Bug Hunter              |
| I3  | Important | `app/(admin)/admin/shops/[id]/page.tsx:86-92`                   | `getToken()` creates new Supabase client + getSession() on every action — inconsistent with `tokenRef` pattern in other pages                 | Architecture            |
| I4  | Important | `app/(admin)/admin/page.tsx`, `jobs/page.tsx`, `shops/[id]…`   | No confirmation dialogs for destructive actions (reject, cancel, unpublish) — design doc requires them                                        | Plan Alignment          |
| I5  | Important | `app/(admin)/admin/page.test.tsx` + `shops/[id]/page.test.tsx` | Zero tests for action buttons (approve/reject on dashboard; enqueue, toggle-live, search-rank on shop detail; retry on jobs page)              | Plan Alignment          |
| I6  | Important | `backend/tests/middleware/test_admin_audit.py:3-24`             | Calls `log_admin_action` directly (internal module) and asserts on raw DB call structure — tests implementation, not observable behavior       | Test Philosophy         |
| I7  | Important | `backend/api/admin_taxonomy.py:29-35`                           | `unique_tagged_shops` fetches rows with `.limit(100_000)` — PostgREST server max_rows (default 1000) overrides client limit, silently truncating count | Bug Hunter, Architecture |
| M1  | Minor     | `backend/tests/middleware/test_admin_audit.py:12,15`            | `admin_user_id="admin-123"`, `target_id="shop-456"` are non-UUID placeholders — inconsistent with UUID test data in all other test files      | Standards               |
| M2  | Minor     | `middleware.ts:72`                                              | Stale comment references `_require_admin` — function was renamed to `require_admin` in this PR                                                | Standards               |
| M3  | Minor     | `app/(admin)/admin/shops/page.tsx:93`                           | `await res.json()` in error path has no `.catch(() => ({}))` fallback — non-JSON error responses throw unhandled exception                    | Bug Hunter              |
| M4  | Minor     | `app/(admin)/layout.tsx`                                        | Layout missing breadcrumb bar and current user indicator — design doc specifies both                                                           | Plan Alignment          |
| M5  | Minor     | `app/(admin)/admin/shops/page.tsx:237-247`                      | Shops list table missing `tag count` and `has_embedding` columns — design doc specifies them                                                   | Plan Alignment          |
| M6  | Minor     | `app/(admin)/admin/taxonomy/page.tsx:120-143`                   | Tag frequency table headers non-clickable — design doc requires sortable columns                                                               | Plan Alignment          |
| M7  | Minor     | All admin page components                                       | No Sonner toast notifications — design doc specifies toast feedback for all admin actions                                                      | Plan Alignment          |
| M8  | Minor     | `app/(admin)/admin/page.tsx:14-18`                              | `Submission` interface omits `submitted_by` — design doc includes it in submissions table                                                      | Plan Alignment          |
| M9  | Minor     | `backend/tests/api/test_admin_shops.py:155-157`                 | `TestAdminShopUpdate` asserts on raw mock call args for `manually_edited_at` — testing implementation, not observable response                 | Test Philosophy         |
| M10 | Minor     | `app/api/__tests__/proxy-routes.test.ts:5-7`                    | `vi.mock('@/lib/api/proxy')` mocks internal module `proxyToBackend` instead of HTTP boundary (Gemini disputes — argues this is standard pattern) | Test Philosophy         |
| M11 | Minor     | `app/api/__tests__/proxy-routes.test.ts` (all test names)       | Test names describe implementation (e.g. `"GET proxies to /admin/shops"`) not user outcomes                                                    | Test Philosophy         |
| M12 | Minor     | `backend/api/admin.py:89`                                       | `retry_job` resets status/attempts but does not clear `claimed_at` — a previously-claimed job's timestamp may confuse worker pickup logic      | Gemini                  |
| M13 | Minor     | `app/(admin)/admin/shops/[id]/page.tsx:38-485`                  | 485-line component with 8 state variables — architecture concern, low priority for internal admin tooling                                      | Architecture            |

### Gemini Disputes

- `proxy-routes.test.ts mocks @/lib/api/proxy` — **Disputed by Gemini**: argues mocking `proxyToBackend` is the standard pattern for testing Next.js proxy routes and verifies the routing contract. **Keeping as Minor** — project CLAUDE.md explicitly states "mock at boundaries only, never mock own modules"; however demoting from Important to Minor given the dispute.

### False Positives Skipped

- **Gemini: approve_submission doesn't update shop.processing_status** — Design intent ambiguous; `shops.processing_status` is set by the pipeline worker's final publish step. Approve marks the submission as human-reviewed. If pipeline auto-publishes without human gate, this is correct behavior. Skip.
- **Gemini: shop_tag_counts REVOKE** — This function is also called by user-facing search and intentionally has PUBLIC access. Architecture agent confirmed: "shop_tag_counts does NOT have REVOKE, which is correct because it is also called from user-facing search."
- **Gemini: deps.py inconsistent admin auth (JWT vs ADMIN_USER_IDS)** — Pre-existing design decision from Pass 2 review (I13), accepted as-is. Conservative double-gate approach is intentional.
- **Gemini: log_admin_action sync blocks event loop** — Pre-existing synchronous Supabase client pattern used across the entire backend. Not introduced by this PR and not actionable without a codebase-wide refactor.
- **admin_taxonomy.py Gemini scalability**: Duplicate of I7 (already included).

### Validation Results

*(Populated after Phase 5 validation)*
- C1: **Valid** — PostgreSQL `CREATE OR REPLACE FUNCTION` cannot change return type
- C2: **Valid** — confirmed no status guard in reject_submission
- I1, I2: **Valid** — unconditional updates confirmed; cancel_job correctly uses conditional update as the reference pattern
- I3: **Valid** — getToken() creates client + getSession() on every call; jobs page uses tokenRef correctly
- I4: **Valid** — design doc §Error Handling explicitly requires confirmation dialogs
- I5: **Valid** — test files for dashboard/shop-detail/jobs confirmed: no action button tests
- I6: **Valid** — test_admin_audit.py confirmed: calls internal function + asserts on mock call structure
- I7: **Valid** — PostgREST default max_rows is 1000; client `.limit(100_000)` does not override server ceiling
- M1-M13: **Valid** (M10 disputed but kept as Minor)
- Proceeding to fix: 2 Critical, 7 Important, 13 Minor

---

## Fix Pass 1

**Pre-fix SHA:** `079e97672ffd1b9eda999b4dae0f8430f3e1a82a`

*(Populated after fixes are applied)*
