# E2E Testing Infrastructure — Design

**Date:** 2026-03-16
**Hat:** CTO
**Approach:** Option C — Playwright + two CI workflows, phased journey implementation

## Context

CafeRoam's e2e tests are currently manual API-level smoke tests documented in markdown (`e2e/plan-*.md`). There are no browser-automated tests. Critical user flows like geolocation ("near me"), map interactions, and responsive layout behavior are untested at the browser level. This design introduces Playwright-based e2e testing with a phased approach: 10 critical paths implemented now, 20+ journeys stubbed as `test.todo()` for incremental fill-in.

## Architecture

```
docs/e2e-journeys.md          ← Source of truth (human-readable journey definitions)
                                  ↕ Journey IDs (J01–J30+)
e2e/
├── playwright.config.ts       ← Config: baseURL from env, mobile + desktop projects
├── fixtures/
│   ├── auth.ts                ← Authenticated session fixture (Supabase test user)
│   └── geolocation.ts         ← Geolocation mock helpers (Taipei coords, deny, out-of-bounds)
├── discovery.spec.ts          ← J01–J04: Near me, search, map browse, shop detail
├── auth.spec.ts               ← J05–J06: Auth wall, signup + PDPA consent
├── search.spec.ts             ← J07–J09: Semantic search, mode filters, suggestion chips
├── checkin.spec.ts            ← J10–J11: Check-in happy path, photo-required enforcement
├── lists.spec.ts              ← J12–J13: List CRUD, 3-list cap
├── profile.spec.ts            ← J14–J15: Profile view, account deletion
├── feed.spec.ts               ← J16: Activity feed public access
├── pwa.spec.ts                ← J17: PWA manifest + installability
└── edge-cases.spec.ts         ← J18+: Geo outside Taiwan, offline, etc.
.github/workflows/
├── e2e-critical.yml           ← PR-blocking: 10 critical journeys (@critical tag)
└── e2e-nightly.yml            ← Cron 2am TWN: full suite
```

## Components

### Playwright Config

- `baseURL`: `process.env.E2E_BASE_URL ?? 'http://localhost:3000'` — one-line switch to Railway staging
- Two projects: `mobile` (iPhone 14) and `desktop` (Desktop Chrome) — covers the `<1024px` / `≥1024px` layout split
- `webServer`: auto-starts `pnpm dev` when no `E2E_BASE_URL` set (CI local mode)
- Retries: 2 in CI, 0 locally
- Trace on first retry, screenshot on failure

### Auth Fixture

- Extends Playwright's `test` with an `authedPage` fixture
- Logs in via Supabase test account (`E2E_USER_EMAIL` / `E2E_USER_PASSWORD`)
- Supports `storageState` for session reuse across tests

### Geolocation Fixture

- `TAIPEI_COORDS`: `{ latitude: 25.033, longitude: 121.565 }` — standard Taipei test coords
- `OUTSIDE_TAIWAN`: `{ latitude: 35.6762, longitude: 139.6503 }` — Tokyo for boundary tests
- `grantGeolocation(context, coords)`: sets permissions + coords via Playwright API
- `denyGeolocation(context)`: clears permissions to simulate denial

## Journey List

### Critical Paths (PR-blocking) — Phase 1

| ID | Journey | Spec file | Auth |
|----|---------|-----------|------|
| J01 | Near Me: grant geolocation → map centered with shop pins | `discovery.spec.ts` | No |
| J02 | Near Me: deny geolocation → toast fallback + text search | `discovery.spec.ts` | No |
| J03 | Text search → results on map → tap pin → shop detail card | `discovery.spec.ts` | No |
| J05 | Auth wall: tap search/lists/check-in → redirect to login | `auth.spec.ts` | No |
| J06 | Signup → PDPA consent → reach home | `auth.spec.ts` | No |
| J07 | Semantic search: "想找安靜可以工作的地方" → ranked results | `search.spec.ts` | Yes |
| J10 | Check-in: upload photo → submit → stamp awarded | `checkin.spec.ts` | Yes |
| J11 | Check-in: attempt submit without photo → validation error | `checkin.spec.ts` | Yes |
| J12 | Create list → add shop → shop appears in list | `lists.spec.ts` | Yes |
| J13 | Create 3 lists → attempt 4th → cap error | `lists.spec.ts` | Yes |

### Full Suite (nightly) — Phase 2 (`test.todo()` stubs)

| ID | Journey | Priority | Spec file | Auth |
|----|---------|----------|-----------|------|
| J04 | Browse map → tap pin → shop detail sheet | High | `discovery.spec.ts` | No |
| J08 | Mode chip: select "work" → filtered results | High | `search.spec.ts` | Yes |
| J09 | Suggestion chip: tap preset → search executes | High | `search.spec.ts` | Yes |
| J14 | Profile: check-in history + stamp collection | High | `profile.spec.ts` | Yes |
| J15 | Account deletion: request → grace period | High | `profile.spec.ts` | Yes |
| J16 | Activity feed: public access | Medium | `feed.spec.ts` | No |
| J17 | PWA manifest: 200 + brand metadata + icons | Medium | `pwa.spec.ts` | No |
| J18 | Shop detail: public access with OG tags | High | `discovery.spec.ts` | No |
| J19 | Shop detail via slug redirect | Medium | `discovery.spec.ts` | No |
| J20 | Near Me: coords outside Taiwan → boundary behavior | Medium | `edge-cases.spec.ts` | No |
| J21 | Filter pills: toggle WiFi → results update | High | `search.spec.ts` | No |
| J22 | Map ↔ List view toggle | Medium | `discovery.spec.ts` | No |
| J23 | List view: shops sorted by distance | Medium | `discovery.spec.ts` | No |
| J24 | Duplicate stamp at same shop (intended) | Medium | `checkin.spec.ts` | Yes |
| J25 | Display name update | Medium | `profile.spec.ts` | Yes |
| J26 | Delete list | Medium | `lists.spec.ts` | Yes |
| J27 | Remove shop from list | Medium | `lists.spec.ts` | Yes |
| J28 | Desktop: 2-column shop detail layout | Medium | `discovery.spec.ts` | No |
| J29 | Mobile: mini card on pin tap | Medium | `discovery.spec.ts` | No |
| J30 | Check-in with optional menu photo + text note | Medium | `checkin.spec.ts` | Yes |

## CI Workflows

### `e2e-critical.yml` — PR-blocking

- Trigger: `pull_request` to `main`
- Runs: `playwright test --grep @critical`
- Environment: local dev server (via `webServer` config) until Railway staging is set up
- Secrets: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_STAGING_URL` (optional)

### `e2e-nightly.yml` — Scheduled

- Trigger: `cron: '0 18 * * *'` (2am Taiwan time) + manual `workflow_dispatch`
- Runs: `playwright test` (full suite)
- Same environment config as critical

### Tag-based filtering

Critical tests use `@critical` in their `describe` block name:
```typescript
test.describe('@critical J01 — Near Me: grant geolocation', () => { ... });
```

## Data Flow

```
User action in browser
  → Playwright drives UI interaction
  → Next.js frontend handles navigation/rendering
  → API calls flow through /api/ proxy to FastAPI backend
  → Assertions verify UI state (DOM elements, URL, toast messages)
```

No direct API assertions — tests observe from the user's perspective only.

## Error Handling

- Flaky tests: `retries: 2` in CI, `trace: 'on-first-retry'`
- Timeout: 30s per test
- Screenshots on failure
- Missing auth env vars: fast-fail with clear error message

## Testing Strategy

- **Phase 1 (now)**: 10 critical paths + all infrastructure. `test.todo()` stubs for 20 more.
- **Phase 2 (incremental)**: Fill stubs as related features are touched.
- **No backend mocking**: Tests hit real frontend → real API. Only browser APIs (geolocation) mocked.
- **Data assumption**: `make seed-shops` data exists. Dedicated e2e test account for auth.
- **Environment switching**: Set `E2E_BASE_URL` to target Railway staging; unset for local dev.

## Decisions

- **Playwright over Cypress**: Playwright supports multi-browser, mobile emulation, geolocation mocking natively, and has better CI performance. See ADR.
- **Two-workflow CI model**: Critical paths block PRs for fast feedback; full suite runs nightly to avoid slow CI without losing coverage.
- **Journey doc as source of truth**: Keeps journey definitions human-readable and skill-compatible (`/e2e-smoke`). Spec files implement but don't replace.
