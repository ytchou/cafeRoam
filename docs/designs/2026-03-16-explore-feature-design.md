# Explore Feature — Design Note

**Date:** 2026-03-16
**Status:** Approved for Phase 3

---

## Problem

The existing Find tab (Home + Map) is utilitarian — it serves users who have intent. It doesn't serve the user who is open, bored, or wants to be surprised. The Explore tab fills this gap.

## Navigation Decision

4-tab bottom nav: **Find | Explore | Favorites | Profile**

- Home + Map tabs consolidate into **Find** (map/list toggle within the tab)
- **Explore** replaces neither — it's additive, occupying the second slot
- Favorites and Profile remain unchanged

The Find/Explore split preserves a meaningful intent distinction:

| Tab     | Mental model                      | User headspace |
| ------- | --------------------------------- | -------------- |
| Find    | I have a goal. Help me locate it. | Purposeful     |
| Explore | I'm open. Show me something.      | Wandering      |

## Explore Page Architecture

Three layers in a single scrollable page — not three equal features, but a progressive engagement hierarchy:

```
[ Surprise Me 🃏 ]        ← hero card, tap-to-reveal (Tarot)
─────────────────
Browse by Vibe            ← horizontal scroll of mood cards
─────────────────
From the Community        ← blog/note feed (Phase 2, grows downward)
```

### Layer 1: Tarot — Surprise Me

Random shop discovery with light intelligence:

- **Location-aware:** radius defaulting to 3km from user location
- **Open-now:** filters by current time against `opening_hours`
- **Not-recently-visited:** excludes shops seen in the last N visits (localStorage for anonymous, DB for auth'd)

The mechanic: one big tap → reveal a shop card. Swipe/dismiss for another pick. This is a shareable moment ("the cafe tarot sent me here").

### Layer 2: Vibe Tags

The `taxonomy_tags` DB already has 100+ tags across 5 dimensions. Vibe tags are **editorial presets** — named combinations of existing tags with human-legible labels. No new data needed; only curation.

Example vibe mappings (to be finalized before implementation):

| Vibe name       | Tag combination                                               |
| --------------- | ------------------------------------------------------------- |
| Study Cave      | `laptop_friendly`, `quiet`, `power_outlets`, `wifi_available` |
| First Date Spot | `cozy`, `photogenic`, `good_espresso`, `quiet`                |
| Hidden Gem      | `hidden_gem`, `local_favorite`                                |
| Weekend Brunch  | `brunch`, `photogenic`, `casual`                              |
| Deep Work HQ    | `deep_work`, `laptop_friendly`, `wifi_available`, `quiet`     |
| Espresso Nerd   | `self_roasted`, `espresso`, `pour_over`                       |
| Outdoor Escape  | `outdoor_seating`, `scenic_view`, `forest_style`              |

Target: 10-15 vibes. Curate, don't enumerate.

### Layer 3: Community Notes (Invite-Only)

Bloggers and coffee KOLs write notes that surface in a feed at the bottom of Explore. Entry point for the beta program — invite-only blogger role, seeded via personal outreach.

This layer is **Phase 2** — it grows into the bottom of the existing Explore page when ready. No nav change required.

---

## Open Questions (pre-brainstorming)

1. For Tarot: should "recently visited" mean "checked in at" or "viewed shop detail page"? Former is more meaningful, latter has more signal.
2. For Vibe Tags: static seed data (JSON/hardcoded) vs. DB-managed vibe definitions? DB is more flexible but adds complexity for V1.
3. For Community: is a note always linked to a specific shop, or can it be a list ("My 5 favorite study cafes")?
