# Design: Phase-2 E2E Stubs — J32–J34, J36, J38–J39

Date: 2026-03-25
Ticket: DEV-25

## Overview

Implement 6 E2E journey stubs (currently `test.fixme()`) as real `@critical` Playwright tests. These cover surfaces shipped in PRs #43–#63 that lack E2E coverage.

## Design Decisions

- **Test data:** Seed data assumed (`make seed-shops`). Tests skip gracefully if no data available (`test.skip()`). Matches existing J10/J11 pattern.
- **Auth:** J32, J38, J39 use the existing `authedPage` fixture. J33 uses standard Playwright (feed is public). J34, J36 use geolocation fixture.
- **J38 safety:** Serial execution (`test.describe.serial`). Test initiates deletion → cancels → verifies restore. Account returns to normal state for subsequent tests.

## Journey Specifications

### J32 — Community feed: like toggle increments count

- **File:** `e2e/feed.spec.ts`
- **Fixture:** `authedPage`
- **Flow:** `/explore/community` → find community card → read like count → tap heart button → assert count +1 and `aria-pressed="true"`
- **Skip if:** Empty feed (no community notes)
- **Selectors:** `button[aria-label*="Like"]`, count text sibling

### J33 — Community feed: MRT filter scopes results

- **File:** `e2e/feed.spec.ts`
- **Fixture:** Standard (public page)
- **Flow:** `/explore/community` → wait for feed → read initial card count → select MRT station from combobox → wait for reload → assert card count changed or no-results message
- **Skip if:** MRT dropdown has no options beyond "All stations"
- **Selectors:** `getByRole('combobox', { name: /MRT station/i })`, feed card elements

### J34 — Explore: Tarot draw → 3 café cards revealed

- **File:** `e2e/explore.spec.ts`
- **Fixture:** Standard + `grantGeolocation(context, TAIPEI_COORDS)`
- **Flow:** `/explore` → wait for "Your Daily Draw" section → assert 3 TarotCard buttons render → tap first card → assert TarotRevealDrawer opens with shop name
- **Skip if:** `TarotEmptyState` appears (no shops in radius)
- **Selectors:** `/your daily draw/i`, card buttons within tarot section, drawer content

### J36 — Shop detail: Get Directions → DirectionsSheet opens

- **File:** `e2e/discovery.spec.ts`
- **Fixture:** Standard + `grantGeolocation(context, TAIPEI_COORDS)`
- **Flow:** Fetch shop via `/api/shops?featured=true&limit=1` → navigate to shop detail → tap "Get There" → assert DirectionsSheet opens with "Directions" heading + route info rows
- **Skip if:** No seeded shops or shop lacks lat/lng
- **Selectors:** `getByRole('button', { name: /get there/i })`, `getByText('Directions')`, route rows

### J38 — Account deletion: cancel during grace period

- **File:** `e2e/profile.spec.ts`
- **Fixture:** `authedPage`, `test.describe.serial`
- **Flow:**
  1. `/settings` → click "Delete Account" → type "DELETE" → confirm
  2. Assert grace period messaging (30-day text)
  3. `/account/recover` → click "Cancel Deletion (取消刪除)"
  4. Assert redirect to `/`
  5. `/profile` → assert profile loads normally
- **Safety:** Serial execution; cancel step restores account state

### J39 — Check-in with review text → appears on shop page

- **File:** `e2e/checkin.spec.ts`
- **Fixture:** `authedPage`
- **Flow:** Fetch shop → `/checkin/{shopId}` → upload test photo → fill review text ("E2E test review — excellent espresso") → submit → navigate to shop detail → scroll to "打卡評價" section → assert review text appears
- **Skip if:** No seeded shops
- **Selectors:** review text input, `getByText('打卡評價')`, review text in cards

## Testing Classification

- **New e2e journey?** Yes — these ARE the 6 new journeys.
- **Coverage gate impact?** No — E2E tests don't affect the 80% unit coverage gate on critical-path services.

## Notes

- Spec drift: Community feed uses MRT station filter (shipped), but SPEC.md references district/vibe tag filters. Tests match shipped UI.
- All tests run on both mobile (iPhone 14) and desktop (Desktop Chrome) Playwright projects.
