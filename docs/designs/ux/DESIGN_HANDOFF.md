# CafeRoam — Design Handoff

> Natural language summary of every approved screen. No code. This is what `/scope` and `/brainstorming` read to understand visual decisions without reopening the journal.

Generated: 2026-03-02

---

## Screen: Home (Mobile)

**Approved screenshot:** `screenshots/search-v3-approved.png`

**Layout intent:** Search is the hero. A terracotta header bar holds the primary AI search bar — prominent, wide, with a sparkle icon signaling AI capability. Below the search bar: suggestion chips (巴斯克蛋糕 / 適合工作 / 安靜一點 / 我附近) that collapse the gap between "I don't know what to type" and "search submitted." A row of filter pills (距離 / 現正營業 / 有插座 / 評分 / 篩選) sits below the chips. Featured shop cards occupy the remaining scroll area.

**Key interactions:** Tapping a suggestion chip pre-fills the search. Filter pills open a bottom-sheet filter panel. Mode chips (工作/放鬆/社交/精品) apply a semantic filter to results. Bottom navigation bar links to Home (active), Map, Lists, Profile.

**Constraints:** Mobile-first, mobile browser only. No native tab bar. Terracotta #E06B3F header must not clash with system status bar on Android. Search bar must be tall enough for thumb tap (min 48px). Suggestion chips must scroll horizontally if more than 4.

---

## Screen: Map (Mobile)

**Approved screenshot:** `screenshots/map-v1-approved.png`

**Layout intent:** Full-bleed map (Mapbox) takes the entire viewport. UI floats over it via glassmorphism cards. The search bar and filter pills are persistent floating elements at the top. Terracotta pins mark coffee shops. One selected pin expands to a mini card at the bottom (shop name, rating, "Open" badge, distance chip) — this mini card is the entry point to the Shop Detail page.

**Key interactions:** Tapping a pin selects it and shows the bottom mini card. Tapping the mini card navigates to Shop Detail. Swipe on the mini card dismisses it (deselects pin). The glassmorphism search bar accepts the same AI natural language queries as the Home search. Bottom nav persists.

**Constraints:** Map tiles must use warm/muted style (not default Google blue) to match brand palette. Glassmorphism requires `backdrop-filter: blur()` — test on lower-end Android devices. Mini card must not obscure more than 30% of viewport height.

---

## Screen: Shop Detail (Mobile)

**Approved screenshot:** `screenshots/shop-detail-v3-approved.png`

**Layout intent:** Single-column scroll. The screen answers "is this place right for me?" in order: hero photo → shop identity (name, rating, Open status, neighborhood) → attribute chips (outlet/WiFi/pets/quiet) → curated description (2 lines) → menu highlights (3 items with emoji + price) → social trust (Recent Check-ins horizontal photo strip with @username + date) → review cards (2 comments with avatar, stars, text) → map thumbnail (with "View on map" link) → sticky bottom "打卡記錄 Check In →" button.

**Key interactions:** Hero photo is tappable — opens full-screen photo gallery. "View on map" thumbnail opens the Map tab centered on this shop. "Check In →" button navigates to the standalone Check-in page (not a tab). Recent check-in thumbnails are tappable — opens that check-in's full photo.

**Constraints:** Check-in is a separate page, not a tab. The sticky bottom bar must sit above the browser chrome on mobile (safe area inset). Menu item names must truncate gracefully at 2 lines. Map thumbnail must work without JS map (use static Mapbox image API for performance).

---

## Screen: Shop Detail (Desktop)

**Approved screenshot:** `screenshots/shop-detail-desktop-v2-approved.png`

**Layout intent:** 2-column grid. Left column (60%, scrollable): sticky top nav → back link → shop identity → attribute chips → description → menu highlights → recent check-ins strip → 3 review cards. Right column (40%, sticky): 3-photo editorial carousel with arrow nav + dot indicators → embedded map → full-width "Check In →" button. The sticky right column ensures photo/map/CTA are always visible as the user scrolls left content.

**Key interactions:** Carousel arrows cycle through 3 photos. Clicking the embedded map opens the full Map tab centered on this shop. "Check In →" navigates to the standalone Check-in page. The sticky nav search bar accepts queries and returns to the Home/search results.

**Constraints:** Right column must remain sticky using `position: sticky; top: 0` — test that it doesn't extend below viewport on short screens. Carousel photo aspect ratio: 16:9. Embedded map: static Mapbox image for performance (no JS map embed on detail page).

---

## Screen: Home (Desktop)

**Approved screenshot:** `screenshots/home-desktop-v2-approved.png`

**Layout intent:** Search-first landing page that communicates CafeRoam's core differentiator within 3 seconds: AI natural language search for coffee shops by vibe, food items, distance, time — something Google Maps cannot do. The product name and the search bar are the only two things above the fold. Hero: bold tagline + large centered AI search bar with suggestion chips covering all search dimensions (食物/vibe/mode/distance/time). Below: 3-column editorial card grid for Featured Picks. Map is NOT in the hero — "View on map →" link appears as a secondary action next to the Featured section header.

**Headline copy (placeholder — to be tuned in feature work):** "找到那間剛剛好的咖啡廳" / "Find the coffee shop that's just right"

**Key interactions:** Typing in the search bar and submitting navigates to the Map tab in search-results mode (left list + right map). Clicking a suggestion chip pre-fills search. Mode chips filter the Featured section cards. "View on map →" opens the Map tab. Login/Sign up links top-right.

**Constraints:** Desktop only (≥1024px breakpoint). On mobile, this screen is not rendered — the mobile Home (search-v3) is shown instead. The hero search bar must be keyboard-focusable without interaction (autofocus on page load). Headline copy is intentionally left as a placeholder for marketing copy finalization.

---

## Screen: Map (Desktop)

**Approved screenshot:** `screenshots/map-desktop-v1-approved.png`

**Layout intent:** Full-viewport map experience for laptop users. Floating glassmorphism nav at top (logo + centered search + mode chips + avatar). Filter pills float below the nav, left-aligned. Map occupies the full browser window behind the floating UI. A bottom-left floating card (~340px) surfaces the selected shop: check-in photo thumbnails → shop name + neighborhood → rating + Open badge → attribute chips → "View Details" (terracotta) and "Check In" (ghost) buttons. A "List View" toggle at bottom-right switches to the left-panel-list + right-map layout (the desktop Home layout).

**Key interactions:** Clicking a terracotta pin on the map opens the bottom-left card. "View Details" navigates to Shop Detail desktop. "Check In" navigates to Check-in page. The "List View" toggle is a URL-based toggle (`?view=list`) — both views are the same route. The glassmorphism nav search accepts the same AI queries as all other screens.

**Constraints:** Glassmorphism nav requires `backdrop-filter: blur(12px)` — provide a solid fallback background for browsers that don't support it. Bottom-left card must not occlude more than 40% of the viewport. The card slides up with a subtle animation on pin select. Terracotta pins must have 44px tap target (circle + invisible padding) for pointer coarseness.

---

## What was NOT designed (deferred to feature work)

- **Check-in page** (mobile + desktop) — standalone page navigated to via "打卡記錄 Check In →" on Shop Detail. Requires: photo upload input, optional text note, optional menu photo, submit CTA.
- **Profile / Stamps page** — user's coffee journey, stamp collection, visit history, lists. Deferred to feature work.
- **Auth screens** (login, signup, OAuth) — standard flows, no custom mockup needed.
- **Lists page** — user's saved shop lists (max 3). Standard list CRUD, no mockup needed before engineering.
- **Search results state** — what the Home screen looks like after a query is submitted. The Map tab in search mode covers this, but the transition animation and results header are not mocked.
