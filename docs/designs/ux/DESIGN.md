# DESIGN.md — CafeRoam (啡遊)

> Agent-readable design system document. Natural language descriptions + exact values. Read this before generating UI mockups (Pencil), writing new components, or making visual decisions.
>
> Format follows the Stitch DESIGN.md convention: descriptive names communicate intent; exact values anchor implementation.

Generated: 2026-03-23 | Derived from: approved Pencil frames + `globals.css` tokens

---

## 1. Visual Theme & Atmosphere

CafeRoam feels like a well-worn coffee journal — warm without being kitsch, precise without being cold. Photography leads every screen; the interface recedes behind imagery. On mobile, the experience is tactile and thumb-friendly, with large touch targets and bottom-anchored CTAs. The AI search capability is surfaced prominently — not hidden behind a filter icon — because finding the right café by vibe is the product's core differentiator.

The tarot reveal mechanic (Explore) adds a playful, slightly mystical register that contrasts intentionally with the utilitarian map. These two modes — purposeful search and serendipitous discovery — should feel like different rooms in the same building: same materials, different light.

---

## 2. Color Palette & Roles

| Name             | Hex       | Role                                                                                                                                          |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Terracotta       | `#E06B3F` | Primary brand accent — CTAs, search bar accents, active states, focus rings, map pin stroke                                                   |
| Map Brown        | `#8b5e3c` | Map pin fill — warm coffee leather, slightly darker than terracotta                                                                           |
| Espresso         | `#2c1810` | Active/selected state backgrounds and dark hero sections — deepest brand tone, used for selected chips, tags, and the `/` discovery page hero |
| Warm White       | `#ffffff` | Page background, card surface, input background                                                                                               |
| Cream Card       | `#fdf8f5` | Selected card background — barely-there warmth that signals selection without using color                                                     |
| Parchment Toggle | `#f0efed` | Toggle backgrounds, inactive tab bars — neutral warm surface                                                                                  |
| Slate Text       | `#6b7280` | Secondary body text — descriptions, metadata, labels                                                                                          |
| Ash Text         | `#9ca3af` | Tertiary text — placeholders, disabled states, timestamps                                                                                     |
| Star Gold        | `#fcd34d` | Rating stars only — never used decoratively                                                                                                   |
| Cool Border      | `#e5e7eb` | Borders, dividers, inactive chip outlines — neutral cool                                                                                      |

**Usage rules:**

- Never apply `bg-[#E06B3F]` directly in shared components — use `bg-primary` if promoted, or a named class
- Espresso (`#2c1810`) is for active/selected state backgrounds and dark hero sections only — never use as general body text color
- Glassmorphism overlays: `backdrop-blur-md bg-white/70` for map floating cards

---

## 3. Typography Rules

**Fonts:**

- **DM Sans** — weight 400/500/700 — primary Latin body, UI labels, button text
- **Noto Sans TC** — weight 400/500/700 — CJK body text, always paired with DM Sans
- **Bricolage Grotesque** — weight 700/800 — display headings only (hero text, tarot card titles, section anchors)

**Font stacks (from `globals.css`):**

- Body: `--font-dm-sans, --font-noto-sans-tc, system-ui, sans-serif`
- Heading: `--font-bricolage, system-ui, sans-serif`
- UI: `--font-geist-sans, --font-noto-sans-tc, system-ui, sans-serif`

**Scale:** Curated practical scale — not a strict ratio. Sizes in use: 12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px+.

**Line height rules:**

- Body (≤18px): 1.5 — comfortable reading
- Subheadings (20–24px): 1.3
- Display / hero (28px+): 1.1 or tighter

**Letter-spacing:**

- Headings in Bricolage: `tracking-tight` at ≥24px
- Normal DM Sans body: no modification
- Never apply `letter-spacing` to Noto Sans TC / CJK characters

**Bilingual layout rule:** When Chinese and English appear together (product name, UI labels), Chinese leads on mobile — "找咖啡" not "Find Cafés". English subtitles sit below at smaller size or muted color.

---

## 4. Component Stylings

### Buttons

**Primary CTA** (e.g., "Check In →", "Search"):

- Background: Terracotta `#E06B3F`
- Text: white, DM Sans 500, 14–16px
- Height: `h-12` (48px) on mobile hero CTAs, `h-10` (40px) for secondary
- Radius: `rounded-full`
- Padding: `px-6 py-3`
- Hover: 10% darkened — `bg-[#C95A2E]`

**Ghost / secondary button:**

- Border: `border border-[#E06B3F]`
- Text: Terracotta
- Same sizing as primary
- Background: transparent

**Disabled state:** Opacity 40%, non-interactive

### Cards (Shop Cards)

**Mobile shop card:**

- Background: white `#ffffff`, selected: `#fdf8f5`
- Border: `border border-[#e5e7eb]` — subtle cool border
- Radius: `rounded-2xl` (20px)
- Padding: `p-4`
- Image: 4:3 aspect ratio, `rounded-xl` inset, `object-cover`
- Shadow: none at rest, `shadow-md` on press/selected

**Map mini card (floating):**

- Background: `bg-white/90 backdrop-blur-md`
- Radius: `rounded-2xl`
- Max height: 30% viewport

**Tarot card:**

- Dark surface: deep espresso gradient
- Decorative border: gold/amber tone
- Typography: Bricolage Grotesque 700
- Radius: `rounded-3xl`

### Navigation

**Mobile bottom nav:**

- Background: white, `border-t border-[#e5e7eb]`
- Height: 64px + safe area inset
- 4 tabs: Home, Map, Lists, Profile (+ Explore)
- Active icon: Terracotta `#E06B3F`, filled
- Inactive icon: Ash `#9ca3af`, stroke only
- Label: 11px DM Sans 500

**Desktop floating nav:**

- Background: `bg-white/70 backdrop-blur-xl`
- Border: `border border-white/40`
- Radius: `rounded-2xl`
- Shadow: `shadow-lg`
- Layout: logo left | search center | mode chips center-right | avatar right

### Inputs & Forms

**Search bar (primary):**

- Height: min 48px (thumb tap)
- Radius: `rounded-full`
- Border: `border border-gray-200`
- Focus ring: `ring-2 ring-[#E06B3F]`
- Padding: `pl-10 pr-4` (icon inset left)
- Background: white

**Filter/bottom sheet inputs:** Standard `rounded-lg` inputs with cool borders.

### Chips & Tags

**Mode chips** (工作 / 放鬆 / 社交 / 精品):

- Active: Background `#2c1810` (espresso), text white
- Inactive: Background white, border `#e5e7eb`, text `#6b7280`
- Height: `h-8` (32px)
- Radius: `rounded-full`
- Padding: `px-3`
- Font: DM Sans 500, 13–14px

**Filter pills** (距離 / 現正營業 / 有插座):

- Same sizing as mode chips
- Active: Terracotta background
- Inactive: Parchment `#f0efed`

**Attribute chips** (shop detail — outlet/WiFi/pets):

- Height: `h-7` (28px)
- Background: `#f0efed`
- Text: Slate `#6b7280`, 12px
- Radius: `rounded-full`

### Map Pins

- Fill: Map Brown `#8b5e3c`
- Stroke: Terracotta `#E06B3F` on selected
- Touch target: minimum 44×44px (invisible padding around visual pin)
- Size: 24×32px visual, larger on selected

---

## 5. Layout Principles

**Mobile (primary):**

- Base width: 390px (iPhone 14 Pro)
- Safe areas: account for home indicator bottom (`pb-safe` / `env(safe-area-inset-bottom)`)
- Scroll: single vertical scroll; no horizontal scroll except suggestion chips
- Fixed elements: bottom nav, sticky CTAs — always above browser chrome
- Padding: horizontal `px-4` (16px) as base; tighter `px-3` inside cards

**Desktop (≥1024px):**

- Two-column: 60/40 split for Shop Detail (content / media+map)
- Home desktop (`/`): search-first Option B layout — centered search bar hero, suggestion chips row, mode chips row (work/rest/social), featured shops list (2-column card grid); no map on homepage
- Find desktop (`/find`): full-viewport map with floating UI panels — no sidebar
- Nav: floating glassmorphism bar at top

**Whitespace philosophy:** Photography-forward means whitespace is structural, not decorative. Cards have just enough breathing room to make the image the hero. Section headers are minimal — the content speaks.

**Grid:** No fixed CSS grid for main layouts — flexbox and `px-4` container. 3-column card grid on desktop only.

**Glassmorphism use:**

- Map floating elements only (desktop nav, mobile map card)
- `backdrop-filter: blur(12px)` — provide solid fallback for unsupported browsers
- Never use glassmorphism on inline content — only overlay surfaces

---

## 6. Design System Notes for AI Generation

When prompting Pencil (or any AI design tool) for CafeRoam UI:

**Brand vocabulary:**

- "Warm terracotta" — not "orange" (too bright), not "rust" (too dark)
- "Espresso dark" — not "black" (too stark)
- "Editorial coffee photography" — not "stock product image"
- "Glassmorphism floating panel" — not "card overlay"
- "Bottom-anchored CTA" — not "footer button"

**Screen descriptions that work:**

- "Mobile shop discovery card with photography-first layout, terracotta accent, warm off-white background, bilingual Chinese-English labels"
- "Full-bleed Mapbox map with glassmorphism floating search bar at top and mini shop card at bottom, terracotta map pins"
- "Tarot reveal card with dark espresso background, Bricolage Grotesque display type, mystical but clean aesthetic"

**What to avoid:**

- Don't use blue, green, or purple — off-brand
- Don't use flat white-on-black modals — too harsh for the warm brand
- Don't center-align body text — left-aligned for all content, center only for display/hero text
- Don't make navigation horizontal tabs — bottom nav only on mobile

**Responsive notes:**

- Always design mobile first at 390px width
- Desktop variants are additive — more columns, not different components
- The map is always the hero on map screens; never crop it to make room for a sidebar

---

## Deferred Screens (not yet in Pencil)

These follow the design system above but don't have approved mockups yet:

- **Check-in page** — photo upload (required), optional text note, optional menu photo, submit CTA
- **Profile / Stamps** — polaroid-style stamp collection grid, visit history timeline, list previews
- **Favorites / Lists page** — list CRUD, 3-list cap enforcement visible to user, shop thumbnails in each list
- **Auth screens** — login, signup, OAuth — use terracotta accents, DM Sans, standard form layout
