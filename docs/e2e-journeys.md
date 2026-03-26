# CafeRoam — E2E Journey Inventory

> Generated: 2026-03-05
> Last updated: 2026-03-25
> Source: docs/designs/2026-03-16-e2e-testing-infrastructure-design.md
> Format: Playwright spec files in `e2e/` directory

---

## How to use this file

This is the **source of truth** for all e2e test journeys. Each journey has:

- A unique ID (J01–J39+) referenced in both this doc and the Playwright spec files
- A priority level (Critical / High / Medium)
- A status (Implemented = `@critical` tag / Stubbed = `test.fixme()` placeholder, Phase 2)

**Running tests:**

- `pnpm e2e:critical` — runs all critical-path tests (PR-blocking in CI)
- `pnpm e2e` — runs the full suite including stubs (nightly CI)

**Adding new journeys:** Add to this doc first (assign an ID), then create the spec.

---

## Critical Paths (PR-blocking)

| ID  | Journey                                                  | Spec                | Status      |
| --- | -------------------------------------------------------- | ------------------- | ----------- |
| J01 | Near Me: grant geolocation → map centered with shop pins | `discovery.spec.ts` | Implemented |
| J02 | Near Me: deny geolocation → toast fallback + text search | `discovery.spec.ts` | Implemented |
| J03 | Text search → results on map                             | `discovery.spec.ts` | Implemented |
| J05 | Auth wall: protected routes redirect to /login           | `auth.spec.ts`      | Implemented |
| J06 | Signup → PDPA consent checkbox required                  | `auth.spec.ts`      | Implemented |
| J07 | Semantic search: Chinese query → ranked results          | `search.spec.ts`    | Implemented |
| J10 | Check-in: upload photo → submit → stamp                  | `checkin.spec.ts`   | Implemented |
| J11 | Check-in: no photo → submit disabled                     | `checkin.spec.ts`   | Implemented |
| J12 | Create list → add shop → appears in list                 | `lists.spec.ts`     | Implemented |
| J13 | 3 lists → 4th attempt → cap error                        | `lists.spec.ts`     | Implemented |
| J14 | Profile: stamp passport + check-in count visible         | `profile.spec.ts`   | Implemented |
| J15 | Account deletion: request → 30-day grace period shown    | `profile.spec.ts`   | Implemented |
| J16 | Community feed: public access + filter UI renders        | `feed.spec.ts`      | Implemented |
| J35 | Explore: vibe tag → navigates to filtered shops page     | `explore.spec.ts`   | Implemented |
| J40 | Follow/unfollow: button state toggle                     | `following.spec.ts` | Implemented |
| J41 | Follow: auth wall redirects to login                     | `following.spec.ts` | Implemented |

## Full Suite (nightly)

| ID  | Journey                                          | Priority | Spec                 | Status      |
| --- | ------------------------------------------------ | -------- | -------------------- | ----------- |
| J04 | Browse map → tap pin → shop detail sheet         | High     | `discovery.spec.ts`  | Implemented |
| J08 | Mode chip: select "work" → filtered results      | High     | `search.spec.ts`     | Implemented |
| J09 | Suggestion chip: tap preset → search executes    | High     | `search.spec.ts`     | Implemented |
| J17 | PWA manifest: 200 + brand metadata + icons       | Medium   | `pwa.spec.ts`        | Implemented |
| J18 | Shop detail: public access with OG tags          | High     | `discovery.spec.ts`  | Implemented |
| J19 | Shop detail via slug redirect                    | Medium   | `discovery.spec.ts`  | Implemented |
| J20 | Near Me: coords outside Taiwan                   | Medium   | `edge-cases.spec.ts` | Implemented |
| J21 | Filter pills: toggle WiFi → results update       | High     | `search.spec.ts`     | Implemented |
| J22 | Map ↔ List view toggle                           | Medium   | `discovery.spec.ts`  | Implemented |
| J23 | List view: shops sorted by distance              | Medium   | `discovery.spec.ts`  | Implemented |
| J24 | Duplicate stamp at same shop                     | Medium   | `checkin.spec.ts`    | Implemented |
| J25 | Display name update                              | Medium   | `profile.spec.ts`    | Implemented |
| J26 | Delete list                                      | Medium   | `lists.spec.ts`      | Implemented |
| J27 | Remove shop from list                            | Medium   | `lists.spec.ts`      | Implemented |
| J28 | Desktop: 2-column shop detail layout             | Medium   | `discovery.spec.ts`  | Implemented |
| J29 | Mobile: mini card on pin tap                     | Medium   | `discovery.spec.ts`  | Implemented |
| J30 | Check-in: optional menu photo + text note        | Medium   | `checkin.spec.ts`    | Implemented |
| J32 | Community feed: like toggle increments count     | High     | `feed.spec.ts`       | Implemented |
| J33 | Community feed: MRT filter scopes results        | Medium   | `feed.spec.ts`       | Implemented |
| J34 | Explore: Tarot draw → 3 café cards revealed      | Medium   | `explore.spec.ts`    | Implemented |
| J36 | Shop detail: Get Directions → DirectionsSheet    | High     | `discovery.spec.ts`  | Implemented |
| J38 | Account deletion: cancel during grace period     | High     | `profile.spec.ts`    | Implemented |
| J39 | Check-in with review text → appears on shop page | High     | `checkin.spec.ts`    | Implemented |

---

## Legacy API-Level Scenarios

The following scenarios were previously tracked as manual API-level tests.
They remain valid but are now covered by Playwright specs or backend pytest.

| Scenario                          | Covered by                             |
| --------------------------------- | -------------------------------------- |
| Anonymous Browse + Auth Wall      | J05 (Playwright) + backend pytest      |
| Signup + PDPA Consent             | J06 (Playwright) + backend pytest      |
| Search + Check-in                 | J07, J10 (Playwright) + backend pytest |
| List Management + Cap Enforcement | J12, J13 (Playwright) + backend pytest |
| Account Deletion                  | J15 (Playwright) + backend pytest      |
| Shop Detail Public Access         | J18 (Playwright) + backend pytest      |
| Map Page Public Access            | J01, J03 (Playwright) + backend pytest |
| Authenticated Search              | J07 (Playwright) + backend pytest      |
| PWA Manifest                      | J17 (Playwright)                       |
| Community Feed                    | J16 (Playwright) + backend pytest      |
| Profile + Stamps                  | J14 (Playwright) + backend pytest      |
