# Code Review Log: feat/reviews

**Date:** 2026-03-04
**Branch:** feat/reviews
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Opus), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (13 validated, 3 false positives skipped)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `supabase/migrations/20260224000007_create_rls_policies.sql:44-46` | Missing RLS UPDATE policy on `check_ins` — PATCH endpoint silently returns 404 for all users | Architecture |
| Critical | `lib/types/index.ts:77-85` + `components/reviews/review-card.tsx:9,22,24,27` | `ShopReview` TypeScript interface uses camelCase but backend sends snake_case — `displayName`, `reviewText`, `confirmedTags`, `reviewedAt` all undefined at runtime | Bug Hunter, Architecture |
| Important | `backend/services/checkin_service.py:55-80` + `backend/api/checkins.py:60-78` | `update_review()` has no `user_id` ownership check — `user["id"]` is available in handler but never passed to service | Bug Hunter, Architecture, Standards |
| Important | `backend/api/shops.py:130-138` | Average rating computed by fetching all rows to Python — O(n) network transfer as review count grows | Bug Hunter, Architecture, Standards |
| Important | `backend/tests/api/test_checkins.py:78-168` | New tests mock own module `CheckInService` instead of DB boundary — tests implementation wiring, not behavior | Standards, Test Philosophy |
| Important | `backend/tests/api/test_shop_reviews.py:17-66` | Tests mock own module `get_admin_db` instead of DB boundary | Standards |
| Important | `components/reviews/reviews-section.test.tsx:7-9` | `vi.mock('@/lib/api/fetch')` mocks own internal module instead of HTTP boundary | Test Philosophy |
| Important | `backend/api/shops.py:46-66` | `GET /shops/{shop_id}/checkins` select query doesn't include review fields — `ShopCheckInSummary` model has nullable review fields but they'll always be null | Plan Alignment |
| Important | `backend/api/checkins.py:78` | PATCH returns 404 for not-found; plan specified 403 (prevents existence disclosure to unauthorized callers) | Plan Alignment |
| Important | `backend/tests/api/test_checkins.py` | No test for cross-user authorization on PATCH /checkins/{id}/review | Architecture |
| Minor | `backend/api/checkins.py:13-20` | `CreateCheckInRequest` missing Pydantic stars validator — inconsistent with `UpdateReviewRequest` which validates stars at 1-5 | Bug Hunter, Architecture |
| Minor | `components/reviews/star-rating.test.tsx:7,13,28` | Three test names reference internal "display mode" concept instead of user-observable behavior | Test Philosophy |
| Minor | `app/(auth)/login/page.tsx` | Pre-existing TypeScript error silenced with `as any` — unrelated to reviews feature | Plan Alignment |

### Validation Results

- Skipped (false positive): `ShopReviewsResponse.total_count` / `average_rating` in snake_case — intentional, matches wire format, `reviews-section.tsx` accesses these correctly
- Skipped (false positive): `test_shop_reviews_empty` aggregation mock — MagicMock default iteration is empty, test passes correctly
- Skipped (false positive): `confirmed_tags` DB default `'{}'` vs Pydantic `None` — both are falsy, code checks truthiness/len, no behavioral impact
- Proceeding to fix: 13 validated issues (2 Critical, 8 Important, 3 Minor)

---
