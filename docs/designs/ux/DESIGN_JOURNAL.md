# CafeRoam — Design Journal

> All mockup decisions recorded here. Read this first when resuming any /ux-design session.

---

## Screen: Search / Landing

### Round 1 — 2026-03-02 (initial batch)

**Prompt used:**

> CafeRoam (啡遊) — mobile landing and search screen. Warm, curated aesthetic like a knowledgeable local friend. Bilingual Traditional Chinese/English. Hero: natural language search bar with placeholder "找間有巴斯克蛋糕的咖啡廳…". Mode chips: 工作 Work / 放鬆 Rest / 社交 Social / 精品 Specialty. 3 featured shop cards below. Bottom nav. Warm off-whites, terracotta, espresso brown.

**Variants:**

- v1a: `screenshots/search-v1a-proposed.png` — Map-dominant. Full-screen map, frosted glass search overlay at top, swipeable cafe carousel at bottom
- v1b: `screenshots/search-v1b-proposed.png` — Search-hero. Large centered search bar, 2×2 mode chip grid, vertical cafe list below
- v1c: `screenshots/search-v1c-proposed.png` — Mode-discovery. Large photography mode tiles in grid, search bar secondary, masonry curated section
- v1d: `screenshots/search-v1d-proposed.png` — Minimal/Zen. Large centered search, whitespace-dominant, content reveals on scroll

**Feedback:** v2a approved as Map screen (second tab). v2b chosen as Home screen direction but needs: more prominent/engaging search bar, search suggestion chips below search, filter capability more clearly visible on both screens.
**Direction chosen:** v2b for Home + v2a for Map — iterating v2b next.

---

### Round 2 — 2026-03-02 (web-app corrected batch)

**Prompt used:**

> Same layout approaches but explicitly web app (Next.js/Tailwind/shadcn/ui), not native iOS. Mobile browser context.

**Variants:**

- v2a: `screenshots/search-v2a-proposed.png` — Map-first web. Full-bleed map, glassmorphism search overlay, single cafe card at bottom → **APPROVED as Map screen**
- v2b: `screenshots/search-v2b-proposed.png` — Search-hero web. Terracotta header with search, dense list below → **chosen direction for Home screen, needs iteration**
- v2c: `screenshots/search-v2c-proposed.png` — Mode-discovery web. Photo tiles, masonry grid → rejected
- v2d: `screenshots/search-v2d-proposed.png` — Minimal zen web. Centered search, scroll-reveal → rejected

**Feedback:** v2a good for Map tab. v2b needs: more prominent search, example suggestions below search bar, clearer filter access.
**Direction chosen:** v2b for Home screen iteration

---

### Round 3 — 2026-03-02 (refined iterations)

**Home screen v3** — `screenshots/search-v3-approved.png`
Changes from v2b: larger search bar with sparkle AI icon, suggestion chips (巴斯克蛋糕 / 適合工作 / 安靜一點 / 我附近), filter pills row with 篩選 button.
**Decision: APPROVED**

**Map screen v1** — `screenshots/map-v1-approved.png`
Changes from v2a: larger glassmorphism search bar with sparkle icon, glassmorphism filter pills floating over map, terracotta pins.
**Decision: APPROVED**

---

## Screen: Shop Detail (Mobile)

### Round 1 — 2026-03-02 (initial batch)

**Variants:**

- v1a: `screenshots/shop-detail-v1a-proposed.png` — Editorial hero. Large hero photo, trust section with recent check-in photos, menu highlights with icons, fixed bottom CTA bar
- v1b: `screenshots/shop-detail-v1b-proposed.png` — Card-based. Photo menu thumbnails, quick info box, stacked CTAs
- v1c: `screenshots/shop-detail-v1c-proposed.png` — Tab-based. Photo carousel, quick-stat row, 3 tabs (資訊/菜單/打卡), floating check-in FAB
- v1d: `screenshots/shop-detail-v1d-proposed.png` — Map-anchored. Full-bleed map top half, content card slides up from below

**Feedback:** Some variants looked native iOS. Check-in should be a separate page, not a tab. Liked: v1a trust section + v1b info boxes + v1a menu highlights. Map should be at the bottom.
**Direction chosen:** Hybrid combining v1a trust section + v1b info boxes + v1a menu highlights + map at bottom. Check-in as a standalone navigation target.

---

### Round 2 — 2026-03-02 (hybrid iteration)

**Prompt changes:** Combined elements from v1a and v1b. Added social trust section (Recent Check-ins photo strip) + Reviews section above the map.

**v2** — `screenshots/shop-detail-v2-proposed.png`
**Feedback:** Missing the social trust / recent check-ins strip. Needs reviews/comments section above map.

---

### Round 3 — 2026-03-02 (with social proof)

**v3** — `screenshots/shop-detail-v3-approved.png`
Changes from v2: Added "最新打卡 Recent Check-ins" horizontal photo strip for social trust, added "評論 Reviews" comment cards section above map, map stays at bottom, sticky "打卡記錄 Check In →" bottom bar.
**Decision: APPROVED**

---

## Screen: Shop Detail (Desktop)

### Round 1 — 2026-03-02 (initial 2-column)

**v1** — `screenshots/shop-detail-desktop-v1-proposed.png`
2-column layout: Left 60% scrollable content (nav, shop info, attributes, description, menu highlights, recent check-ins, reviews), Right 40% sticky (hero photo + map + check-in CTA).
**Feedback:** Right column should have a photo carousel instead of single hero photo.

---

### Round 2 — 2026-03-02 (with carousel)

**v2** — `screenshots/shop-detail-desktop-v2-approved.png`
Changed right column single hero photo to a 3-image editorial carousel with arrow navigation and dot indicators. Rest of layout unchanged.
**Decision: APPROVED**

---

## Screen: Home (Desktop)

### Round 1 — 2026-03-02 (map-sidebar layout)

**v1** — `screenshots/home-desktop-v1-approved.png` → **reassigned as Map screen**
Terracotta nav + left sidebar (38%): mode chips, suggestion chips, filter pills, cafe list. Right (62%): full-height interactive map with terracotta pins + popup.
**Feedback:** This layout is better as the Map tab, not the Home. Home should emphasize search intelligence as the differentiator — Google Maps can't do natural language / food-item / vibe search. Map should be smaller on Home.
**Reassigned:** `screenshots/map-desktop-v1-approved.png` — APPROVED as Map desktop

---

### Round 2 — 2026-03-02 (search-first)

**v2** — `screenshots/home-desktop-v2-approved.png`
Search-first redesign. Top nav (minimal). Hero section: bold tagline + large AI search bar centered + suggestion chips (basque cake / work-friendly / quiet / specialty / nearby / open now) + mode filter chips. Below: 3-column editorial featured cards grid + "View on map →" link. No hero map.
**Feedback:** Design approved. Headline copy ("找到那間剛剛好的咖啡廳") feels awkward — will tune later.

**Round 3 — copy experiment** — `screenshots/home-desktop-v3-proposed.png`
Tried: "說出你想要的，我們來找" / "Tell us what you want, we'll find it" — reverted to v2 copy for now.
**Decision: APPROVED (v2 — original copy placeholder, wording to be tuned in feature work)**

---

## Screen: Map (Desktop)

### Round 1 — 2026-03-02

**v1** — `screenshots/map-desktop-v1-approved.png`
(Reassigned from home-desktop-v1. See Home Desktop Round 1 above.)
Full-bleed map. Floating glassmorphism nav with AI search + mode chips. Floating filter pills below nav. Bottom-left floating card (340px): check-in thumbnail strip, shop name, attributes, "View Details" + "Check In" buttons. Bottom-right: "List View" toggle.
**Decision: APPROVED**
