# CafeRoam — E2E Journey Inventory

> Generated: 2026-03-05
> Last updated: 2026-03-16
> Source: docs/designs/ux/journeys.md + personas.md
> Format: E2E-ready scenarios for /e2e-smoke skill

---

## How to use this file

Run `/e2e-smoke` — it reads this file in Phase 0 (REVIEW) to find stale scenarios and new candidates.
Each scenario below maps to a critical user path. Update `Last run` and `Last result` after each run.

---

### Anonymous Browse + Auth Wall

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Yuki
**Pre-conditions:** not logged in, app running locally
**Steps:**

1. `GET /api/search?q=coffee` — assert 401
2. `GET /lists` — assert 307 redirect to `/login`
3. `GET /search` — assert 307 redirect to `/login`
4. `GET /checkin/test` — assert 307 redirect to `/login`
   **Success criteria:** unauthenticated user cannot access search, lists, check-in; all redirect or 401
   **Failure indicators:** search completes without auth, no redirect occurs, or a 500 error is returned
   **DB state change:** none

---

### Signup + PDPA Consent

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Yuki
**Pre-conditions:** not logged in, using a fresh test email
**Steps:**

1. `POST /auth/v1/signup` with email + password — assert JWT returned
2. `POST /api/auth/consent` with `Authorization: Bearer {jwt}` — assert 200 with `pdpa_consent_at` set
3. Assert redirect to `/` home page with authenticated state (browser-only)
   **Success criteria:** account created, PDPA consent recorded with timestamp
   **Failure indicators:** signup fails, consent not recorded in DB, or Authorization header not forwarded
   **DB state change:** new row in auth.users, profiles row with pdpa_consent_at set

---

### Search + Check-in

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Mei-Ling
**Pre-conditions:** logged in (JWT from signup), at least 1 seed shop exists in DB, e2e/fixtures/test-photo.jpg present
**Steps:**

1. `GET /api/search?text=specialty+coffee` with auth — assert 200, ≥1 result
2. Upload photo to `checkin-photos/{user_id}/filename.jpg` — assert 200 (path must include user_id for RLS)
3. `POST /api/checkins` with `shop_id` + `photo_urls` — assert 200, `is_first_checkin_at_shop: true`
4. `GET /api/stamps` — assert stamp row with matching `shop_id` present
5. Assert stamp toast appears on screen (BROWSER-ONLY — UNVERIFIED in API mode)
   **Success criteria:** check-in recorded in DB, stamp awarded, stamp toast visible to user
   **Failure indicators:** check-in fails, stamp not awarded, 422 from API, or toast does not appear
   **DB state change:** new row in check_ins, new row in stamps
   **Note:** Storage RLS requires `{user_id}/` path prefix. Arbitrary paths return 403.

---

### List Management + Cap Enforcement

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Mei-Ling
**Pre-conditions:** logged in (JWT), user has 0 existing lists, at least 1 seed shop exists in DB
**Steps:**

1. `POST /api/lists` × 3 with unique names — assert 200 each
2. `POST /api/lists` (4th attempt) — assert 400 `{"detail":"Maximum of 3 lists allowed"}`
3. `POST /api/lists/{id}/shops` with `{"shop_id":"..."}` — assert 200
   **Success criteria:** exactly 3 lists can be created, 4th rejected with 400, shop added successfully
   **Failure indicators:** 4th list created (cap not enforced), or adding shop fails
   **DB state change:** 3 rows in lists, 1 row in list_items
   **Note:** Lists domain uses `snake_case` throughout (`shop_id` not `shopId`)

---

### Account Deletion

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Any authenticated user
**Pre-conditions:** fresh throwaway user (create via signup for this test)
**Steps:**

1. Create throwaway user via `POST /auth/v1/signup`
2. `DELETE /api/auth/account` with auth — assert 200
3. Assert response contains `deletion_requested_at` timestamp
4. Assert account still exists during grace period (not immediately deleted)
   **Success criteria:** deletion_requested_at set on profile row, account exists during grace period
   **Failure indicators:** account deleted immediately, no grace period, or 500 error
   **DB state change:** profiles.deletion_requested_at set to current timestamp

---

### Shop Detail Public Access

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Yuki
**Pre-conditions:** not logged in, slugs backfilled
**Steps:**

1. `GET /shops/{id}` (backend) — assert 200 with camelCase fields: `photoUrls`, `modeScores`, `taxonomyTags`, `slug`
2. `GET /shops/{id}/{slug}` (frontend) — assert 200
3. `GET /shops/{id}/wrong-slug` — assert 307 redirect to canonical slug
4. `GET /shops/00000000-0000-0000-0000-000000000000/nope` — assert 404
   **Success criteria:** shop detail loads, slug redirect works, missing shop 404s cleanly
   **Failure indicators:** 500 on any request, camelCase fields missing, 404 on valid shop
   **DB state change:** none

---

### PWA Manifest Accessibility

**Last run:** never
**Last result:** PENDING
**Persona:** Yuki (anonymous)
**Pre-conditions:** not logged in, app running locally
**Steps:**

1. `GET /manifest.webmanifest` without auth — assert 200, `Content-Type` contains `application/manifest+json`
2. Assert response JSON has `name: '啡遊 CafeRoam'`, `short_name: '啡遊'`, `display: 'standalone'`
3. Assert `theme_color: '#6F4E37'` (brand coffee brown)
4. Assert `icons` array contains entries for `/icon-192.png` (192×192), `/icon-512.png` (512×512), and `/icon-512-maskable.png` (maskable)
   **Success criteria:** manifest returns valid JSON without requiring auth; icons and brand metadata are correct
   **Failure indicators:** 307 redirect to `/login`, missing icons array, incorrect `display` value, or `theme_color` mismatch
   **DB state change:** none
   **Note:** Depends on `/manifest.webmanifest` being in `PUBLIC_ROUTES` in `middleware.ts`. Regression would silently break PWA installability on Chrome/Safari.

---

### Map Page Public Access

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Yuki
**Pre-conditions:** not logged in
**Steps:**

1. `GET /map` — assert 200 (no redirect to login)
2. `GET /shops/?featured=true&limit=5` — assert ≥1 shop with `latitude` field
   **Success criteria:** map page loads publicly, shop geo data present
   **Failure indicators:** redirect to login, no shops returned, missing lat/lng
   **DB state change:** none

---

### Authenticated Search

**Last run:** 2026-03-15
**Last result:** PASS
**Persona:** Mei-Ling
**Pre-conditions:** logged in (JWT)
**Steps:**

1. `GET /api/search?text=specialty+coffee` with `Authorization: Bearer {jwt}` — assert 200
2. Assert ≥1 result; results are wrapped as `[{"shop": {...}}, ...]`
3. Assert `shop` object contains camelCase fields: `photoUrls`, `modeScores`, `taxonomyTags`
   **Success criteria:** search returns camelCase-shaped results with correct wrapper structure
   **Failure indicators:** 401, empty results, snake_case fields, missing wrapper
   **DB state change:** none
