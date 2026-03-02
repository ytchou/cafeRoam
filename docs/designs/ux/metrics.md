# CafeRoam — Success Metrics

> Generated: 2026-03-02
> One set of KPIs per persona. Each KPI is a user behavior, not a vanity metric.
> These metrics define what gets instrumented in PostHog before launch.

---

## Persona 1: Yuki — Solo Discovery

**Primary KPI:** User submits a search query AND taps a shop result within the same session, at least once per week.

- Why: This is the complete "found what I wanted" loop. A search with no tap = bad results or slow load. A tap with no search = she navigated directly (not our differentiator).
- PostHog events: `search_submitted` → `shop_detail_viewed` (within same session, time-to-tap < 60s)

**Secondary KPIs:**
- % of sessions with a food/item-specific query (e.g. "巴斯克蛋糕", "手沖") — measures natural language adoption over generic keyword use
  - Event: `search_submitted` with `query_type: "item_specific"` (classified server-side)
- 7-day return rate after first search session — measures habit formation
  - Event: `session_start` where `days_since_first_session <= 7` AND `previous_sessions > 0`

---

## Persona 2: Jason — Social Coordinator

**Primary KPI:** User copies a CafeRoam shop URL (or taps a native share button) at least once in a session.

- Why: Jason's value is "share one convincing link." If he copies the URL, it means the page passed his quality bar and is leaving the app. This is the behavior that drives word-of-mouth.
- PostHog event: `shop_url_copied` OR `native_share_triggered` on Shop Detail page

**Secondary KPIs:**
- % of sessions that visit 2+ shop detail pages (comparison behavior)
  - Event: `shop_detail_viewed` count per session ≥ 2
- Time-to-share from session start — measures how quickly the app resolves the "where should we go" question
  - Event: time delta between `session_start` and `shop_url_copied`

---

## Persona 3: Mei-Ling — Coffee Enthusiast

**Primary KPI:** User completes a check-in (photo uploaded, form submitted) at a shop they have not checked in to before.

- Why: Mei-Ling's loop is discover → visit → log → repeat. A check-in at a new shop confirms all three steps worked. Repeat check-ins at the same shop are intentional (stamp mechanic) but not her primary driver.
- PostHog event: `checkin_completed` where `is_first_checkin_at_shop: true`

**Secondary KPIs:**
- User opens their stamp collection / profile at least once per week (habit signal)
  - Event: `profile_stamps_viewed` with `days_since_last_visit <= 7`
- User performs a specialty-specific search (e.g. "Yirgacheffe", "single origin", "精品咖啡") — measures data depth adoption
  - Event: `search_submitted` where `query_type: "specialty_coffee"` (classified server-side)

---

## Cross-Persona Events to Instrument

| Event | Required properties | Screens |
|---|---|---|
| `search_submitted` | `query_text`, `query_type` (classified), `mode_chip_active`, `result_count` | Home, Map |
| `shop_detail_viewed` | `shop_id`, `referrer` (search / map_pin / direct), `session_search_query` | Shop Detail |
| `shop_url_copied` | `shop_id`, `copy_method` (native_share / clipboard) | Shop Detail |
| `checkin_completed` | `shop_id`, `is_first_checkin_at_shop`, `has_text_note`, `has_menu_photo` | Check-in page |
| `profile_stamps_viewed` | `stamp_count` | Profile |
| `filter_applied` | `filter_type`, `filter_value` | Home, Map |
| `session_start` | `days_since_first_session`, `previous_sessions` | All |

---

## Launch Gate

Before launch, verify PostHog is capturing all 7 events above on staging. Confirm `query_type` classification is running server-side (not client-side — we don't want to expose classification logic). Confirm `is_first_checkin_at_shop` is resolved from DB, not frontend state.
