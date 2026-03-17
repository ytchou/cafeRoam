# Explore Tarot — 3-Card Spread Redesign

**Date:** 2026-03-17
**Status:** Approved
**Supersedes:** Tarot section of [2026-03-16-explore-feature-design.md](2026-03-16-explore-feature-design.md)

---

## Problem with the V1 Tarot Mechanic

The original design showed one shop immediately with a "Reveal Another" button. This has no anticipation — it's a randomizer with a tarot label. The magic of tarot is the beat _before_ the reveal: the face-down card, the choice, the moment of commitment. Without that, there's nothing to share and nothing to feel.

---

## New Mechanic: 3-Card Spread

Three face-down **horizontal** (landscape-orientation) cards are shown simultaneously on page load. Each card shows its **tarot title** but not the shop name. The user picks one → a full-screen modal reveals the shop.

### Why 3 cards

- Creates a sense of abundance ("there are always more possibilities")
- The choice becomes meaningful: "I picked The Scholar's Refuge" carries intent
- Titles visible on face-down cards create FOMO: the user wonders what's behind the other two
- Classic 3-card tarot spread — reads immediately as intentional, not gimmicky

### Why horizontal cards

- 3 portrait cards side-by-side on a 393px phone = ~110px each, too narrow
- Horizontal cards stack vertically at full width (~353px × ~140px each)
- Title text fits on a single line — no wrapping, no truncation
- The spread reads cleanly: three horizontal bands, each with its own identity

---

## Card States

### State 1: Face-Down (page load)

```
┌──────────────────────────────────────┐
│ ✦  THE SCHOLAR'S REFUGE          ✦  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ ✦  THE HIDDEN ALCOVE             ✦  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ ✦  THE ALCHEMIST'S TABLE         ✦  │
└──────────────────────────────────────┘
        Tap a card to reveal your café
```

Each card:

- **Background:** dark espresso `#2C1810`
- **Border:** warm gold double border (ornamental)
- **Left/right decorative elements:** coffee cup icon + sparkle symbols
- **Title:** all-caps, single line, centred, warm gold or cream
- **No shop name visible** — only the archetype title

### State 2: Revealed (full-screen modal)

Tapping a card opens a full-screen sheet (slides up ceremonially). Layout:

```
┌─────────────────────────────────┐
│   ✦ Your Draw  ·  2026.03.17 ✦ │  ← ornamental header bar
├─────────────────────────────────┤
│                                 │
│   [shop photo, full bleed]      │
│                                 │
│   ┌─────────────────────────┐   │
│   │  THE SCHOLAR'S REFUGE   │   │  ← tarot title (large, all-caps)
│   └─────────────────────────┘   │
│                                 │
│   Hinoki Coffee                 │  ← actual shop name (secondary)
│   大安區  ·  Open Now  ·  ★4.7  │
│                                 │
│   "For those who seek quiet     │
│    in a world full of noise."   │  ← flavor text (one line, fixed per shop)
│                                 │
├─────────────────────────────────┤
│  [ Share My Draw ]  [ Let's Go ]│
│       [ Draw Again ]            │
└─────────────────────────────────┘
```

### What happens to the other 2 cards

They **persist**. Dismissing the modal returns the user to the 3-card spread with the revealed card visually marked as "opened" (e.g. slightly dimmed, with a "✓ Revealed" badge). The other two remain fully interactive — the user can open them too.

"Draw Again" reloads all 3 fresh (new random draw).

### Share card

"Share My Draw" generates a clean portrait card optimized for Threads/Instagram Stories:

```
┌──────────────────────┐
│   CafeRoam 啡遊  ✦  │
│                      │
│   [shop photo]       │
│                      │
│  THE SCHOLAR'S       │
│  REFUGE              │
│                      │
│  Hinoki Coffee       │
│  大安區              │
│                      │
│  Drawn 2026.03.17    │
└──────────────────────┘
```

No app chrome — just the card. This is the actual post.

---

## Data Model Changes

### New enrichment fields

Generated by Claude during the `ENRICH_SHOP` worker pass. Stored on the `shops` table.

| Field         | Type  | Description                                                                          |
| ------------- | ----- | ------------------------------------------------------------------------------------ |
| `tarot_title` | `str` | Mystical archetype name from a fixed vocabulary                                      |
| `flavor_text` | `str` | One-line tarot-reading flavor (e.g. "For those who seek quiet in an unquiet world.") |

### Tarot title vocabulary (~30 archetypes)

Titles are assigned based on the shop's dominant `taxonomy_tags`. One title per shop. Titles draw from a **fixed vocabulary** — this keeps them feeling scarce and meaningful.

| Tag combination                                | Tarot title           |
| ---------------------------------------------- | --------------------- |
| `quiet` + `laptop_friendly` + `wifi_available` | The Scholar's Refuge  |
| `cozy` + `photogenic` + `good_espresso`        | The Enchanted Corner  |
| `hidden_gem` + `local_favorite`                | The Hidden Alcove     |
| `self_roasted` + `pour_over`                   | The Alchemist's Table |
| `outdoor_seating` + `scenic_view`              | The Open Sky          |
| `brunch` + `photogenic` + `casual`             | The Morning Garden    |
| `espresso` + `self_roasted`                    | The Master's Workshop |
| `quiet` + `minimalist`                         | The Silent Chapel     |
| `retro` + `local_favorite`                     | The Time Capsule      |
| `social` + `large_space` + `group_friendly`    | The Grand Hall        |
| `specialty_coffee` + `award_winning`           | The Crown             |
| `cat_cafe` OR `dog_friendly`                   | The Familiar's Den    |
| `rooftop` OR `view`                            | The Lookout           |
| `forest_style` + `natural_light`               | The Forest Floor      |
| `industrial` + `minimalist`                    | The Iron Garden       |
| `night_friendly` + `late_hours`                | The Midnight Lamp     |
| `japanese_style`                               | The Eastern Path      |
| `vintage` + `retro`                            | The Collector's Room  |
| `standing_bar` + `espresso`                    | The Quick Draw        |
| `bookshelf` OR `reading_friendly`              | The Library           |

> **Finalize before enrichment pass.** Aim for 25–30 titles. The enrichment prompt should pick the single best-fitting title from this list, not generate a free-form string.

**Constraint enforced at query time:** No two shops in the same 3-card draw should share the same title. The `GET /explore/tarot-draw` endpoint filters to ensure title uniqueness within a single draw.

---

## API Design

### New endpoint: GET /explore/tarot-draw

Replaces the originally-planned `GET /shops/random`.

```
GET /explore/tarot-draw?lat={lat}&lng={lng}&radius_km=3
```

**Filters applied (server-side):**

- Open now (respects `opening_hours`)
- Within `radius_km` of user location
- Excludes recently-seen shops (anonymous: from request cookie/header with last 9 shop IDs; authenticated: from DB)
- Ensures tarot title uniqueness within the 3 returned shops

**Response shape:**

```json
[
  {
    "shop_id": "uuid",
    "tarot_title": "The Scholar's Refuge",
    "flavor_text": "For those who seek quiet in an unquiet world.",
    "is_open_now": true,
    "distance_km": 1.2,
    "name": "Hinoki Coffee",
    "neighborhood": "大安區",
    "cover_photo_url": "https://...",
    "rating": 4.7,
    "review_count": 38
  }
]
```

Full shop details are returned immediately (no second request on reveal). The frontend simply holds them until the card is tapped.

### Recently-seen tracking

| User state    | Mechanism                                                     |
| ------------- | ------------------------------------------------------------- |
| Anonymous     | Cookie or localStorage — last 9 drawn shop IDs                |
| Authenticated | `recently_viewed_shops` DB table or existing check-in history |

---

## Visual Design

### Card ornamental style

- Background: `#2C1810` (dark espresso)
- Border: double — thin outer stroke `#C4922A` (warm gold), inner ornamental frame
- Decorative elements: `☕ ✦ ◎` pattern on left/right sides of title
- Typography: all-caps, `Bricolage Grotesque`, letter-spacing ~2px, warm gold or cream (`#F5EDE4`)
- Card height: ~140px (horizontal/landscape)
- Card width: full container width with `20px` horizontal margin

### Visual state for "already revealed" card

- Reduced opacity: 60%
- Small "✓ Revealed" badge bottom-right
- Still tappable (user can re-read the revealed card)

---

## Pencil Design Artifacts

| Frame                                               | Status         |
| --------------------------------------------------- | -------------- |
| `Explore View` (UOZmR) — 3-card spread state        | Needs redesign |
| `Explore View / Tarot Revealed` — full-screen modal | Needs creation |

---

## Future: Claude-Generated Flavor Text at Runtime

V1 uses fixed flavor text generated during enrichment. A later version (Phase 4+) could generate flavor text at runtime using Claude, incorporating:

- Time of day ("A morning place for morning people")
- User check-in history ("You haven't been to Zhongshan in a while")
- Weather or season

This requires a thin Claude call per draw, which is fast but adds latency and cost. Evaluate after beta data confirms the feature has retention value.

---

## Out of Scope (V1)

- Shake-to-draw gesture
- Animation between face-down and full-screen modal (implement in code, not designed in Pencil)
- Claude-generated flavor text at runtime
- More than 3 cards per draw
