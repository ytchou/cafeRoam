# Code Review Log: ytchou/dev-209-add-social-media-links-and-google-maps-link-to-shop-detail

**Date:** 2026-04-11
**Branch:** ytchou/dev-209-add-social-media-links-and-google-maps-link-to-shop-detail
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (inline), Standards (inline), Architecture (inline), Plan Alignment (inline), Test Philosophy (inline), Design Quality (inline), Adversarial Review (Codex)._

### Issues Found (11 total)

| Severity  | File:Line                                                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Flagged By                               |
| --------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Critical  | node_modules:1                                                          | `node_modules` committed as a symlink (mode 120000) pointing to `/Users/ytchou/Project/caferoam/node_modules` — a personal absolute path. Will break for every other developer and CI on checkout, and may also let tools traverse outside the repo. Must be removed and confirmed in `.gitignore`.                                                                                                                                                                                                                                                   | Bug Hunter, Adversarial Review (Codex)   |
| Important | scripts/backfill_social_urls.py:17-67                                   | Destructive backfill loads `SUPABASE_SERVICE_ROLE_KEY` and performs unbounded row-by-row writes over every shop with a website. No `--dry-run` flag, no env gating, no `CONFIRM_PROD=YES` guardrail, no batching/retry. Pointed at the wrong env, a single run could mass-mutate prod. Add a dry-run mode, an explicit confirm gate, and switch to bulk updates.                                                                                                                                                                                      | Adversarial Review (Codex)               |
| Critical  | app/shops/[shopId]/[slug]/shop-detail-client.tsx:290-336                | Touch targets for the 4 social/website icon links are only `h-5 w-5` (20px) with no padding. Below the 44px minimum required for mobile (CafeRoam is mobile-first, and the existing `navigationLinks` row in this same file uses `min-h-[44px]`). Wrap each `<a>` in a `min-h-[44px] min-w-[44px] flex items-center justify-center` (or similar) to meet WCAG 2.5.5 / Apple HIG.                                                                                                                                                                      | Design Quality                           |
| Important | supabase/migrations/20260410000004_add_user_preferences_to_profiles.sql | Migration was renamed from `20260410000003_add_user_preferences_to_profiles.sql` → `20260410000004_…sql`. If the original timestamp was already applied to staging, Supabase migration tracking will see a brand-new migration and try to re-apply the same DDL, which will fail. Verify staging history (`supabase migration list`) before pushing — and if already applied, revert the rename and create a new forward migration instead.                                                                                                           | Bug Hunter, Adversarial Review (Codex)   |
| Important | app/shops/[shopId]/[slug]/shop-detail-client.tsx:265                    | New section uses bare `border-t` (default Tailwind gray) while every other border in this file uses the brand token `border-border-warm` (lines 254, 345, 349, 369). Off-brand and visually inconsistent. Change to `border-border-warm border-t`.                                                                                                                                                                                                                                                                                                    | Design Quality / Standards               |
| Important | app/shops/[shopId]/[slug]/shop-detail-client.tsx:268-288                | Google Maps URL is built inline (`https://www.google.com/maps/place/?q=place_id:${shop.googlePlaceId}` and a separate lat/lng branch) instead of reusing the existing `getGoogleMapsUrl()` helper from `lib/utils/maps.ts` which is already used elsewhere in this same file (line 168). This duplicates logic and creates a second source of truth — `getGoogleMapsUrl()` currently ignores `googlePlaceId`, but the right fix is to extend that helper, not bypass it. Also produces inconsistent URLs depending on which entrypoint a user clicks. | Architecture                             |
| Important | app/shops/[shopId]/[slug]/shop-detail-client.tsx:265                    | The visibility guard `(shop.latitude && shop.longitude)` is falsy when either coordinate is `0` (equator / prime meridian). Latent bug — Taipei avoids it, but the existing pattern in this file is `shop.latitude != null && shop.longitude != null` (line 163) which is correct. Use `!= null` for parity.                                                                                                                                                                                                                                          | Bug Hunter                               |
| Important | app/shops/[shopId]/[slug]/shop-detail-client.tsx:265                    | The conditional renders the entire links section even if only `googlePlaceId` is present — but the design doc states the Google Maps icon should "render unconditionally (every shop has coordinates)". The current `googlePlaceId ? : lat/lng ? : null` ladder hides the Maps icon for shops with neither, which contradicts the design doc and the test "renders Google Maps link using lat/lng when no googlePlaceId" only covers the lat/lng path. Decide which is intended and align doc + code + tests.                                         | Plan Alignment                           |
| Minor     | backend/providers/scraper/apify_adapter.py:93-110                       | Local variable names `_website`, `_social`, `_instagram_from_apify`, `_facebook_from_apify` use leading underscore convention typically reserved for "private/unused". They're regular locals — drop the underscore for clarity. Pre-existing code in `_parse_place` does not use this style.                                                                                                                                                                                                                                                         | Standards                                |
| Important | app/shops/[shopId]/[slug]/shop-detail-client.tsx:25-46                  | `SOCIAL_DOMAINS` set + `isSocialUrl()` helper duplicate the host list from `backend/utils/url_classifier.py` and `scripts/prebuild/data-pipeline/utils/url-classifier.ts`. Three sources of truth for the same domain list — they will drift, causing inconsistent behavior between UI display, prebuild pipeline, and API persistence. Consolidate into one shared source (extract to a `lib/` module reused by the React component and pipeline; backend stays its own copy but pin via contract test).                                             | Architecture, Adversarial Review (Codex) |
| Minor     | app/shops/[shopId]/[slug]/shop-detail-client.test.tsx:43-79             | New test descriptions use implementation framing ("renders Instagram link when instagramUrl is set", "does not render Instagram link when instagramUrl is null") instead of user-journey framing per CLAUDE.md testing principle 2 ("Frame tests from user journeys"). Prefer "Given a shop with an Instagram URL, the user can click through to Instagram". Borderline; flagged as minor only.                                                                                                                                                       | Test Philosophy                          |

### Validation Results

All 10 issues validated against the diff and surrounding code. No false positives identified — each is a real problem in this codebase, with the following classifications:

- **Valid (8):** node_modules symlink, touch target sizes, migration rename collision, off-brand border, inline Google Maps URL, falsy-zero coordinate guard, three-source duplication of domain list, underscore local-var convention.
- **Debatable but lean-fix (2):** Maps-icon-always-visible vs. design doc (need clarification of intent), test description framing.
- **Incorrect (0):** none.

Skipped: none.

## Fix Pass 1

**Pre-fix SHA:** 54355f847dece119a0e26dbc82b32241335ce9ce
**Issues fixed:**

- [Critical] node_modules:1 — Removed symlink from git tracking (git rm --cached)
- [Critical] shop-detail-client.tsx:290-336 — Added min-h-[44px] min-w-[44px] flex wrapper to all 4 social/Maps icon links
- [Important] scripts/backfill_social_urls.py:17-67 — Added --apply flag; default is now dry-run, requires --apply to write
- [Important] shop-detail-client.tsx:265 — Changed bare border-t to border-t border-border-warm
- [Important] shop-detail-client.tsx:268-288 — Extended getGoogleMapsUrl() to prefer place_id; refactored inline URL to use helper
- [Important] shop-detail-client.tsx:265 — Fixed falsy-zero guard (lat && lng) → (lat != null && lng != null)
- [Important] shop-detail-client.tsx:25-46 — Extracted isSocialUrl to lib/utils/url-classifier.ts; component imports from shared utility
- [Minor] backend/providers/scraper/apify_adapter.py:93-110 — Renamed leading-underscore local vars
- [Minor] shop-detail-client.test.tsx:144-158 — Reframed test names to user-journey descriptions
  **Issues skipped:**
- supabase/migrations/20260410000004\_...:1 — Already fixed in commit 1bb438d; migration state clean
- shop-detail-client.tsx:265-288 (design doc alignment) — Conditional guard is correct; underlying falsy-zero bug fixed separately

**Batch Test + Lint Run:**

- `pnpm test` — PASS
- `cd backend && uv run pytest` — PASS
- `pnpm lint` — PASS
- `cd backend && uv run ruff check .` — PASS

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Test Philosophy, Design Quality_
_Agents skipped: Adversarial Review (Codex) — discovery-only_

### Previously Flagged Issues — Resolution Status

- [Critical] node_modules:1 — ✓ Resolved
- [Critical] shop-detail-client.tsx:290-336 — ✓ Resolved (min-h-[44px] min-w-[44px] confirmed)
- [Important] scripts/backfill_social_urls.py — ✓ Resolved (--apply gate added)
- [Important] migration rename — ✓ Resolved (pre-existing, confirmed clean)
- [Important] shop-detail-client.tsx border-border-warm — ✓ Resolved
- [Important] shop-detail-client.tsx Maps URL duplication — ✓ Resolved
- [Important] shop-detail-client.tsx latitude falsy guard — ✓ Resolved
- [Important] shop-detail-client.tsx plan alignment — ✓ Resolved
- [Important] shop-detail-client.tsx isSocialUrl duplication — ✓ Resolved
- [Minor] apify_adapter.py underscore prefix — ✓ Resolved
- [Minor] test descriptions — ✓ Resolved

### New Issues Found (1)

| Severity  | File:Line                   | Description                                                                                                                                    | Flagged By |
| --------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Important | lib/utils/maps.test.ts:5-29 | getGoogleMapsUrl() was extended to prefer place_id URLs but maps.test.ts was not updated — 2 test expectations still assert the old URL format | Bug Hunter |

**Immediate fix:** Updated maps.test.ts expectations to match new behavior. All 3 tests pass. Committed as `8525159`.

## Final State

**Iterations completed:** 1 (+ 1 regression fix)
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-11-ytchou-dev-209-add-social-media-links-and-google-maps-link-to-shop-detail.md
