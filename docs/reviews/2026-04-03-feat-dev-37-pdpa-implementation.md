# Code Review Log: feat/dev-37-pdpa-implementation

**Date:** 2026-04-03
**Branch:** feat/dev-37-pdpa-implementation
**PR:** #158
**Mode:** Post-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (14 total)

| #   | Severity  | File:Line                                            | Description                                                                                                                                                                         | Flagged By                   |
| --- | --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Critical  | `components/owner/analytics-terms-banner.tsx:38`     | "I understand" button has `focus:outline-none` class but no replacement — missing WCAG focus indicator on interactive element                                                       | Design Quality, Bug Hunter   |
| 2   | Critical  | `app/(protected)/settings/page.tsx:255`              | Toggle switch `h-6` = 24px touch target (below 44px minimum); also has `focus:outline-none` with no replacement focus indicator                                                     | Design Quality               |
| 3   | Important | `app/owner/[shopId]/dashboard/page.tsx:51`           | Dashboard visible during `termsLoading=true` — condition `!termsLoading && !termsAccepted` only shows banner AFTER load, exposing analytics during the loading window               | Bug Hunter, Architecture     |
| 4   | Important | `backend/api/owner.py:GET /analytics-terms`          | DB query direct on `shop_claims` in API layer, bypassing OwnerService — violates CLAUDE.md file ownership table (HTTP proxy must not contain DB queries)                            | Standards, Architecture      |
| 5   | Important | `backend/api/owner.py:POST /analytics-terms`         | Same as #4 — DB mutation in API layer                                                                                                                                               | Standards, Architecture      |
| 6   | Important | `backend/services/profile_service.py:44`             | `rows[0]` unsafe array indexing — CLAUDE.md mandates using `first()` helper from `backend/core/db.py`                                                                               | Standards                    |
| 7   | Important | `components/owner/analytics-terms-banner.tsx`        | Blocking modal (`role="dialog" aria-modal="true"`) has no focus trap — keyboard users can tab outside the modal                                                                     | Bug Hunter, Architecture     |
| 8   | Important | `backend/services/owner_service.py`                  | `suppress_demographic_slice()` has no callers — k-anonymity threshold added as infrastructure but never enforced in analytics query path; `data-terms` page promises k≥10 to owners | Plan Alignment, Architecture |
| 9   | Important | `app/(protected)/settings/page.tsx:255`              | Toggle uses `bg-blue-600` (off-brand) — DESIGN.md: "Don't use blue, green, or purple"; should be `bg-brand`                                                                         | Design Quality               |
| 10  | Important | `app/(protected)/settings/page.tsx`                  | Analytics opt-out text link area uses `text-blue-600` (off-brand) — should be `text-link-green` if links exist                                                                      | Design Quality               |
| 11  | Important | Missing tests                                        | No backend tests for GET/POST `/owner/{shopId}/analytics-terms` endpoints                                                                                                           | Test Philosophy              |
| 12  | Important | Missing tests                                        | No frontend tests for `analytics-terms-banner.tsx` and `use-owner-analytics-terms.ts`                                                                                               | Test Philosophy              |
| 13  | Minor     | `lib/hooks/use-owner-analytics-terms.ts:acceptTerms` | `mutate({ accepted: true }, false)` disables revalidation permanently — server state never re-fetched after optimistic update; stale on page revisit                                | Bug Hunter                   |
| 14  | Minor     | `backend/api/owner.py:POST /analytics-terms`         | Returns 200 even when zero rows were updated (idempotent intent, but no confirmation the row existed)                                                                               | Bug Hunter                   |

### Validation Results

_(Populated after Phase 4)_

---

## Pass 1 — Fix Plan

**Critical fixes first:**

1. Add `focus-visible:ring-2 focus-visible:ring-offset-2` to analytics-terms-banner button
2. Expand settings toggle to `min-h-[44px] min-w-[44px]` wrapper or redesign; add focus-visible ring; replace `bg-blue-600` → `bg-brand`

**Important fixes:** 3. Dashboard: change condition to `(termsLoading || !termsAccepted)` — block during load AND when not accepted 4. Move analytics-terms DB logic to `OwnerService.get_analytics_terms_status()` and `OwnerService.accept_analytics_terms()` 5. `profile_service.py:44` — replace `rows[0]` with `first(rows)` 6. Focus trap in `analytics-terms-banner.tsx` — use shadcn `<Dialog>` or add manual focus trap 7. Wire `suppress_demographic_slice()` into the analytics data query — or add a stub guard

**Tests:** 8. Backend: pytest for analytics-terms GET/POST 9. Frontend: Vitest for banner + hook

**Minor fixes:** 10. `use-owner-analytics-terms.ts`: re-enable revalidation `mutate(undefined, true)` after POST
