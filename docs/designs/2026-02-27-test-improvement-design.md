# Test Improvement Initiative — Design

**Date:** 2026-02-27
**Hat:** CTO
**Status:** Approved

## Context

A test audit revealed that ~30% of CafeRoam's test suite is high-quality (A-grade), while ~70% is either placeholder tests that assert nothing meaningful or tests missing critical error/edge cases. Eight critical user journeys have zero test coverage, including launch-blocking business rules (3-list cap, check-in photo validation, PDPA deletion cascade).

### Audit Results

| Grade       | Count | Files                                                                                            |
| ----------- | ----- | ------------------------------------------------------------------------------------------------ |
| A (keep)    | 5     | callback.test.ts, middleware.test.ts, settings/page.test.tsx, recover.test.tsx, consent.test.tsx |
| B (improve) | 3     | login.test.tsx, signup.test.tsx, proxy-routes.test.ts                                            |
| D (rewrite) | 4     | page.test.tsx, lists/page.test.tsx, search/page.test.tsx, profile/page.test.tsx                  |

### Critical Journey Gaps

1. Semantic search (core feature)
2. List management + 3-list cap enforcement (critical business rule)
3. Check-in with photo upload (mandatory flow)
4. Shop detail view & filters
5. Profile / stamp collection
6. OAuth social login (Google/LINE)
7. Account deletion cascade (PDPA compliance)
8. Weekly email digest

## Design Decisions

- **Mock strategy:** Keep existing `vi.mock()` pattern at boundaries. No MSW migration needed — the boundary principle matters, not the tooling.
- **Scope:** Both frontend (Vitest + Testing Library) and backend (pytest).
- **Phasing:** By business risk, not by layer. Cross-stack per journey.
- **Test infra:** Create shared factories and mock helpers to enforce realistic data and reduce boilerplate.

## Shared Test Infrastructure

### Frontend (`lib/test-utils/`)

| File           | Purpose                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `factories.ts` | Data factories: `makeUser()`, `makeShop()`, `makeList()`, `makeCheckIn()`, `makeStamp()` — realistic Taiwan data, overridable defaults |
| `mocks.ts`     | Boundary mock helpers: `createMockSupabaseAuth()`, `createMockRouter()` — extracted from existing A-grade tests                        |

### Backend (`backend/tests/factories.py`)

| Function         | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `make_user()`    | Realistic user with configurable metadata, consent state |
| `make_shop()`    | Shop with realistic Taiwanese name, coordinates, tags    |
| `make_list()`    | List with owner reference and optional shop items        |
| `make_checkin()` | Check-in with photo URL, optional note, timestamp        |

Factories use overridable defaults — every field has a realistic default but can be overridden per-test.

## Phase Plan

### Phase 0 — Foundations (test infra, no behavior changes)

- Create `lib/test-utils/factories.ts`
- Create `lib/test-utils/mocks.ts` (extract from existing A-grade tests)
- ~~Create `lib/test-utils/render.ts`~~ — descoped at planning time; add when first test needs provider pre-wiring
- Create `backend/tests/factories.py`
- Refactor 1 existing A-grade test to use new utilities (validate pattern)

### Phase 1 — Launch Blockers (critical business rules)

| Journey            | Layer    | What to Test                                                                                              |
| ------------------ | -------- | --------------------------------------------------------------------------------------------------------- |
| **3-list cap**     | Backend  | POST /lists when user has 3 → 400. POST when user has 2 → 201.                                            |
| **3-list cap**     | Frontend | Given user has 3 lists, create button shows error. Given 0-2, create succeeds.                            |
| **Check-in photo** | Backend  | POST /checkins without photo → 400. With valid photo → 201 + stamp.                                       |
| **Check-in photo** | Frontend | Form submit disabled without photo. Upload + submit → success + stamp.                                    |
| **PDPA cascade**   | Backend  | DELETE /auth/account → photos removed, lists deleted, check-ins deleted, stamps deleted, profile deleted. |
| **PDPA cascade**   | Frontend | Already A-grade — verify endpoint call with auth header.                                                  |

### Phase 2 — Core Features (D-grade rewrites)

| Journey            | Layer    | What to Test                                                                       |
| ------------------ | -------- | ---------------------------------------------------------------------------------- |
| **Search**         | Backend  | Query → embedding → pgvector results. Empty query → error. Taxonomy boost ranking. |
| **Search**         | Frontend | User types query → shop cards with name/tags. No results → empty state.            |
| **List CRUD**      | Frontend | Create → appears. Add shop → visible. Remove shop → gone. Delete list → gone.      |
| **Profile/stamps** | Frontend | 3 check-ins + 2 stamps → history + collection renders. New user → empty state.     |

### Phase 3 — Auth Hardening (B-grade → A-grade)

| Journey           | Layer    | What to Test                                                                                  |
| ----------------- | -------- | --------------------------------------------------------------------------------------------- |
| **Login errors**  | Frontend | Wrong password → error. Network failure → error. Empty fields → validation. Realistic emails. |
| **Signup errors** | Frontend | Email taken → error. Password short → validation. PDPA unchecked → blocked.                   |
| **OAuth flow**    | Frontend | Google → `signInWithOAuth` with correct provider. LINE → same. Callback error → display.      |
| **Proxy routes**  | Frontend | Request body forwarding, auth header, error responses.                                        |

### Phase 4 — Coverage Extensions (nice-to-haves)

| Journey          | Layer    | What to Test                                                      |
| ---------------- | -------- | ----------------------------------------------------------------- |
| **Homepage**     | Frontend | Featured shops or search CTA. Auth state affects visible actions. |
| **Shop detail**  | Frontend | Shop info, map, tags. Check-in button visible when authed.        |
| **Email digest** | Backend  | Weekly cron content. Unsubscribe flag respected.                  |

## Success Criteria

| Metric                            | Before | After Phase 2 | After Phase 4 |
| --------------------------------- | ------ | ------------- | ------------- |
| D-grade test files                | 4      | 0             | 0             |
| Critical journey coverage         | 2/8    | 6/8           | 8/8           |
| Frontend test quality (A/B grade) | 7/12   | 11/12         | 12/12         |
| Backend launch-blocker coverage   | 0%     | 100%          | 100%          |

## Testing Philosophy Reference

See [`docs/testing-philosophy.md`](../testing-philosophy.md) for the full testing philosophy that all new tests must follow.
