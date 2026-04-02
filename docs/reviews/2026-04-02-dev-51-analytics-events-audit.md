# Analytics Events Audit — DEV-51

**Date:** 2026-04-02
**Auditor:** Patrick Chou
**Scope:** All PostHog + GA4 events fired across the frontend and backend analytics gateway, cross-referenced against `docs/designs/ux/metrics.md`.

---

## Spec Event Coverage — 7/7

All 7 events from `metrics.md` are instrumented.

| Event                   | File                                                      | Properties                                                     | Status                    |
| ----------------------- | --------------------------------------------------------- | -------------------------------------------------------------- | ------------------------- |
| `session_start`         | `components/session-tracker.tsx`                          | `days_since_first_session`, `previous_sessions`                | ✓                         |
| `search_submitted`      | `app/(protected)/search/page.tsx`                         | `query_text`, `query_type`, `mode_chip_active`, `result_count` | ✓                         |
| `shop_detail_viewed`    | `app/shops/[shopId]/[slug]/shop-detail-client.tsx`        | `shop_id`, `referrer`, `session_search_query`                  | ✓                         |
| `shop_url_copied`       | `components/shops/share-popover.tsx` + `share-button.tsx` | `shop_id`, `copy_method`                                       | ✓                         |
| `checkin_completed`     | `app/(protected)/checkin/[shopId]/page.tsx`               | `shop_id`, `has_text_note`, `has_menu_photo`                   | ✓                         |
| `profile_stamps_viewed` | `app/(protected)/profile/page.tsx`                        | `stamp_count`                                                  | ✓                         |
| `filter_applied`        | `components/discovery/filter-sheet.tsx`                   | `filter_type`, `filter_value`                                  | ✓ (bug fixed — see below) |

---

## GA4 Events — 3/3

| Event              | Caller                                               | Properties     |
| ------------------ | ---------------------------------------------------- | -------------- |
| `search`           | `app/page.tsx` via `trackSearch()`                   | `search_term`  |
| `shop_detail_view` | `shop-detail-client.tsx` via `trackShopDetailView()` | `shop_id`      |
| `signup_cta_click` | `app/page.tsx` via `trackSignupCtaClick('banner')`   | `cta_location` |

---

## Phase 3+ Passthrough Events — 13 events

All Phase 3+ features that are shipped have analytics. Events go through the passthrough PDPA filter.

| Event                   | File                                       | Properties                |
| ----------------------- | ------------------------------------------ | ------------------------- |
| `tarot_draw_loaded`     | `app/explore/page.tsx`                     | `card_count`              |
| `tarot_card_tapped`     | `components/tarot/tarot-spread.tsx`        | `shop_id`, `tarot_title`  |
| `tarot_share_tapped`    | `components/tarot/tarot-spread.tsx`        | `shop_id`, `share_method` |
| `tarot_lets_go`         | `components/tarot/tarot-reveal-drawer.tsx` | `shop_id`                 |
| `tarot_draw_again`      | `components/tarot/tarot-reveal-drawer.tsx` | _(none)_                  |
| `tarot_empty_state`     | `app/explore/page.tsx`                     | `radius_km`               |
| `community_feed_opened` | `app/explore/community/page.tsx`           | `referrer`                |
| `community_note_viewed` | `components/community/community-card.tsx`  | `checkin_id`              |
| `community_note_liked`  | `app/explore/community/page.tsx`           | `checkin_id`              |
| `view_toggled`          | `app/page.tsx`                             | `to_view`                 |
| `shop_preview_opened`   | `components/shops/shop-preview-card.tsx`   | `shop_id`, `source`       |
| `claim_form_viewed`     | `app/shops/[shopId]/claim/page.tsx`        | `shop_id`                 |
| `claim_form_submitted`  | `app/shops/[shopId]/claim/page.tsx`        | `shop_id`, `role`         |

---

## PDPA Filter Status — PASS

- Spec events: validated via per-event Pydantic property models — extras and PII stripped automatically via typed allowlist.
- Passthrough events: `PDPA_BLOCKED_FIELDS = {"email", "phone", "user_id", "name", "address"}`. All 13 passthrough events inspected — no PII in properties. ✓

---

## Bug Fixed — `filter_applied` property type mismatch

**Symptom:** No `filter_applied` events in PostHog despite the filter sheet being used.

**Root cause:** `filter-sheet.tsx` sends `filter_value` as `string[]` (array of selected tag slugs), but `FilterAppliedProperties` in `backend/models/analytics_events.py` declared `filter_value: str`. Pydantic validation fails silently (422, swallowed by `useAnalytics` catch).

**Fix:** Changed `FilterAppliedProperties.filter_value` from `str` to `list[str]`. Updated 2 existing tests + added 1 regression test.

---

## Missing Events — 3 gaps (follow-up tickets needed)

These Phase 3+ features are shipped but have no analytics instrumentation:

| Feature                | File                                | Missing event(s)                   |
| ---------------------- | ----------------------------------- | ---------------------------------- |
| Vibe tag browse        | `app/explore/vibes/[slug]/page.tsx` | `vibe_tag_browsed` (or similar)    |
| Follow / unfollow shop | (action in shop detail / profile)   | `shop_followed`, `shop_unfollowed` |
| Shop submission        | `app/(protected)/submit/page.tsx`   | `shop_submitted`                   |

Recommend creating follow-up tickets before beta if these flows matter for launch metrics.

---

## Minor — Test boundary violations (low priority)

Five test files added after the 2026-03-24 audit still mock `useAnalytics` as an internal module (violates mock-at-boundaries principle):

- `components/tarot/tarot-spread.test.tsx`
- `components/tarot/tarot-reveal-drawer.test.tsx`
- `app/explore/page.test.tsx`
- `app/__tests__/find-page.test.tsx`
- `app/__tests__/find-page-integration.test.tsx`

Not blocking — low risk, no incorrect behavior. Clean up in a dedicated test hygiene pass.
