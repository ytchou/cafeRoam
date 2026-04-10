# Design: Cold-start preference onboarding (DEV-297)

**Date:** 2026-04-10
**Ticket:** [DEV-297](https://linear.app/ytchou/issue/DEV-297)
**Hat:** CTO
**Status:** Approved

## Context

CafeRoam needs a short post-signup step that collects a small amount of preference data before any check-in history exists, so first-session users aren't looking at a generic list. The original ticket proposed three clinical fields (Visit purpose = Work/Rest/Social, Preferred vibe = Quiet/Lively/Cozy/Modern, Preferred area = district) that mapped 1:1 to internal taxonomy. That framing was rejected: it feels weird to a new user who hasn't yet used the product, and district commitment felt premature for users who move around Taipei.

This design replaces the clinical labels with natural-language story prompts ("What brings you here today?", "How do you like your coffee shops?", "Anything else you're hoping to find?") and hides the taxonomy mapping behind the scenes. The step lives as a dismissible modal over the home page (not a gate), runs once, and is paired with a small server-side change that makes the featured shop list re-rank itself when the user has preferences set — so the form has an immediate, honest payoff instead of being data collection with no consumer.

## Strategic flags (addressed, not dismissed)

Four flags surfaced during alignment; the design explicitly mitigates each:

| Flag                                           | Source              | Mitigation                                                                     |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| Orphaned data — DEV-295 (rec engine) not built | Related ticket      | Add featured-shops re-rank as an immediate consumer (below)                    |
| "Observe, don't prescribe"                     | `ASSUMPTIONS.md` U1 | Step 3 is an optional open-text field so we learn from beta users' own framing |
| Retention friction (40% Week-4 target)         | `PRD.md`            | Modal over home (home renders behind it); single-skip-never-re-prompt          |
| Vibe is weakest enrichment signal (NDCG 0.43)  | `ASSUMPTIONS.md`    | Vibes stored but not consumed yet; waits for DEV-295                           |

## Decisions

| Question     | Decision                                                                | Rationale                                                                        |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Primary goal | All three layered: UX welcome + product research + seed recs            | Step should _feel_ valuable, inform observation, and feed future personalization |
| Framing      | Curated story prompts, tap-to-select cards, taxonomy hidden             | Matches user intent: friendly quiz, not settings form                            |
| Step 1       | "What brings you here today?" → multi-select mode                       | Natural language, maps to shop mode scores                                       |
| Step 2       | "How do you like your coffee shops?" → vibe chips                       | Reuses existing `vibe_collections` slugs                                         |
| Step 3       | "Anything else you're hoping to find?" → 1-line optional text           | Observation channel; respects U1                                                 |
| Schema       | Extend `profiles` table                                                 | Matches `analytics_opt_out` precedent; inherits RLS + PDPA cascade               |
| Placement    | Modal on home, first visit only                                         | Lowest friction; home renders behind                                             |
| Skip         | Single skip, never re-prompt                                            | Respects user time; user can edit later from profile settings (follow-up)        |
| Consumer     | Re-rank `/shops?featured=true` by mode score when `preferred_modes` set | Immediate payoff; unblocks latent mode-chip gap                                  |

## User flow

```
email verification → /auth/callback
  → writes pdpa_consent_at (for email signups) OR redirects to /onboarding/consent
/onboarding/consent
  → POST /api/auth/consent → redirect to /
/ (home page — first visit after consent)
  → home renders normally in background
  → PreferenceOnboardingModal opens over it
     Step 1/3: "What brings you here today?"
       [💻 Focus time] [🌿 Slow afternoon] [🤝 Catching up] [☕ Anywhere]
       multi-select  →  preferred_modes: ['work','rest','social']
     Step 2/3: "How do you like your coffee shops?"
       [📚 Study cave] [🌅 Slow morning] [💻 Deep work] [🌙 Late owl]
       [🐱 Cat cafe]   [🥐 Brunch]       [💕 First date] [💎 Hidden gem]
       multi-select chips reusing vibe_collections slugs
     Step 3/3: "Anything else you're hoping to find? (optional)"
       <single-line input, 280 char cap>  [Finish →]  [Skip]
  → POST /api/profile/preferences
  → modal closes
  → home re-fetches featured list (SWR revalidate) → mode-biased ordering
```

**Skip paths:** Close (X) or "Skip" at any step → `POST /api/profile/preferences/dismiss` writes `preferences_prompted_at = now()`, modal closes, never reappears.

**Re-prompt rule:** Modal shows only when `preferences_completed_at IS NULL AND preferences_prompted_at IS NULL`.

## Architecture

### Database

Single migration adding 5 nullable columns to `profiles`:

```sql
ALTER TABLE profiles
  ADD COLUMN preferred_modes text[] DEFAULT NULL,
  ADD COLUMN preferred_vibes text[] DEFAULT NULL,
  ADD COLUMN onboarding_note text DEFAULT NULL,
  ADD COLUMN preferences_completed_at timestamptz DEFAULT NULL,
  ADD COLUMN preferences_prompted_at  timestamptz DEFAULT NULL;

ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_modes_valid
  CHECK (
    preferred_modes IS NULL OR
    preferred_modes <@ ARRAY['work','rest','social']::text[]
  );

ALTER TABLE profiles ADD CONSTRAINT profiles_onboarding_note_len
  CHECK (onboarding_note IS NULL OR char_length(onboarding_note) <= 280);
```

- No validation on `preferred_vibes` at DB level — slug set is dynamic (managed via `vibe_collections` table). Validated in service layer.
- RLS inherits: existing `profiles_own_update` is table-scoped, covers the new columns automatically.
- PDPA cascade: existing account deletion already cascades the `profiles` row; nothing new.
- No new index needed — lookups use existing PK.

### Backend

**New Pydantic models** (`backend/models/types.py`):

```python
class PreferenceOnboardingRequest(CamelModel):
    preferred_modes: list[Literal["work", "rest", "social"]] | None = None
    preferred_vibes: list[str] | None = None  # slugs from vibe_collections
    onboarding_note: str | None = Field(None, max_length=280)

class PreferenceOnboardingStatus(CamelModel):
    should_prompt: bool
    preferred_modes: list[str] | None
    preferred_vibes: list[str] | None
    onboarding_note: str | None
```

**Extend `ProfileService`** (`backend/services/profile_service.py`):

- `get_preference_status(user_id)` → `PreferenceOnboardingStatus` — `should_prompt = (completed_at IS NULL AND prompted_at IS NULL)`
- `save_preferences(user_id, req)` — partial update using `model_fields_set` (preserves fields client didn't send); sets `preferences_completed_at = now()`; validates `preferred_vibes` slugs against `vibe_collections` and raises 422 on unknown
- `dismiss_preferences(user_id)` — writes `preferences_prompted_at = now()` only
- `get_preferred_modes(user_id)` → `list[str] | None` — helper used by the shops endpoint for re-rank

**New routes** (extend `backend/api/profile.py`):

```
GET  /profile/preferences/status   → PreferenceOnboardingStatus
POST /profile/preferences          → saves preferences, returns updated status
POST /profile/preferences/dismiss  → marks prompted, returns status
```

All three use the existing `Depends(get_current_user)` + `Depends(get_user_db)` pattern from `backend/api/auth.py:16-51`.

**Extend featured shops endpoint** (`backend/api/shops.py:73-110`):

- Route becomes auth-aware: takes an _optional_ user via a new `Depends(get_optional_user)` helper (or reuses existing one if present — to be confirmed during implementation)
- If user is authenticated AND has `preferred_modes IS NOT NULL`, re-rank results by `GREATEST(mode_<m>, …)` over their preferred modes
- Unauthenticated behavior unchanged — still insertion-order

SQL sketch:

```sql
SELECT <_SHOP_LIST_COLUMNS>
FROM shops
WHERE processing_status = 'live'
ORDER BY
  CASE WHEN $1::text[] IS NOT NULL THEN
    GREATEST(
      CASE WHEN 'work'   = ANY($1) THEN mode_work   ELSE 0 END,
      CASE WHEN 'rest'   = ANY($1) THEN mode_rest   ELSE 0 END,
      CASE WHEN 'social' = ANY($1) THEN mode_social ELSE 0 END
    )
  ELSE 0 END DESC,
  id  -- stable tiebreaker
LIMIT $2;
```

Implementation note: Supabase-py's query builder doesn't support `GREATEST(...)` ordering directly. Two options:

1. **Recommended:** Add a Postgres RPC function `get_featured_shops_for_user(preferred_modes text[], limit int)` and call via `db.rpc()`. Keeps the SQL explicit and tested.
2. Apply the ordering client-side in Python after `SELECT` (works but re-sorts 200 rows in memory — acceptable at current scale).

Decision deferred to the implementation task — start with option 2 for simplicity, only add the RPC if profiling shows the Python sort is meaningful.

### Next.js proxy routes

Three thin proxy routes under `app/api/profile/preferences/`:

- `app/api/profile/preferences/status/route.ts` — GET
- `app/api/profile/preferences/route.ts` — POST
- `app/api/profile/preferences/dismiss/route.ts` — POST

Each follows the existing `app/api/auth/consent/route.ts` + `lib/api/proxy.ts` pattern: forward `Authorization` header, relay backend response.

### Frontend

**New component** — `components/onboarding/preference-modal.tsx`:

- `<Dialog>` from `components/ui/dialog` (shadcn/radix-ui). Full-screen on mobile (via custom CSS), centered modal on desktop.
- Three-step internal state machine (React `useState`, no router changes).
- Step 1: `<ChipGroup>` with 4 mode cards (Focus time, Slow afternoon, Catching up, Anywhere), multi-select, Espresso bg on selected.
- Step 2: `<ChipGroup>` with vibe chips — data fetched from existing backend route `/explore/vibes` (needs Next.js proxy at `app/api/explore/vibes/route.ts` if missing).
- Step 3: Single-line `<Input>` (280 char cap), optional.
- Primary CTA: Terracotta (`#E06B3F`), full-width, rounded-full, h-12 (matches `DESIGN.md`).
- Skip link: Espresso text, low emphasis, visible on all three steps.
- Close (X): top-right, same behavior as Skip.

**New hook** — `lib/hooks/use-preference-onboarding.ts`:

- Uses SWR + `fetchWithAuth` (same pattern as `lib/hooks/use-shops.ts`).
- Fetches `/api/profile/preferences/status` on mount.
- Returns `{ shouldPrompt, save, dismiss, isLoading }`.
- `save(payload)` and `dismiss()` each `POST` and then `mutate()` the status key.

**Home page integration** — `app/page.tsx`:

- Import `PreferenceOnboardingModal` and `usePreferenceOnboarding`.
- Render modal conditionally: `shouldPrompt && user` (don't fetch status if no user).
- Home's shop-list fetch (`useShops({ featured: true, limit: 200 })`) proceeds independently — modal does not block render.
- On successful `save`, call SWR `mutate(shopsKey)` to re-fetch featured list with the new preferences applied.

**Mode labels (hardcoded in `preference-modal.tsx`):**

```ts
const MODE_OPTIONS = [
  {
    slug: 'work',
    emoji: '💻',
    label: 'Focus time',
    blurb: 'A corner to get work done',
  },
  {
    slug: 'rest',
    emoji: '🌿',
    label: 'Slow afternoon',
    blurb: 'Just want to breathe and sip',
  },
  {
    slug: 'social',
    emoji: '🤝',
    label: 'Catching up',
    blurb: 'Meeting someone over coffee',
  },
  {
    slug: null,
    emoji: '☕',
    label: 'Anywhere',
    blurb: 'I just love coffee shops',
  },
];
```

"Anywhere" resolves to an empty array on submit (no bias applied).

## Testing strategy

Follows the project's [testing philosophy](../testing-philosophy.md) — integration-biased, boundaries-only mocking, user-journey framing.

### Backend

- **Service tests** (new file: `backend/tests/test_profile_preferences.py`):
  - Happy path: new user → `should_prompt=true`; save → `should_prompt=false`; dismiss → `should_prompt=false`
  - Validation: invalid mode literal → 422; invalid vibe slug → 422; note > 280 chars → 422
  - Partial update: only writes fields the client sent
  - Dismiss-then-save: later save still writes `completed_at` (for profile-settings edit flow)
- **Shops re-rank tests** (extend `backend/tests/api/test_shops.py`):
  - Unauthenticated `/shops?featured=true` → insertion order preserved
  - Authenticated, no preferences → same as unauthenticated
  - Authenticated with `preferred_modes=['work']` → shops with highest `mode_work` appear first
  - Authenticated with multi-mode → `GREATEST` semantics verified

### Frontend

- **Modal component tests** (`components/onboarding/__tests__/preference-modal.test.tsx`):
  - Step-advance flow: select mode → Next → step 2
  - Vibe multi-select toggle
  - Optional step 3: submit with empty note works
  - Skip from any step → calls `dismiss`, modal closes
  - Close (X) → calls `dismiss`
  - Submit → calls `save` with correct payload shape
- **Hook tests** (`lib/hooks/__tests__/use-preference-onboarding.test.ts`):
  - Fetches status on mount
  - `shouldPrompt` drives return value
  - `save`/`dismiss` mutate the status key
- **Home integration** (`app/__tests__/page-onboarding.test.tsx` or extend existing):
  - Modal shown when `shouldPrompt=true` + authenticated
  - Modal NOT shown when `shouldPrompt=false`
  - Modal NOT shown for unauthenticated users (no fetch)

### E2E (Playwright)

New journey in `/e2e-smoke`:

- Completion path: signup → consent → home → modal appears → fill mode → fill vibe → finish → modal closes → featured list re-orders
- Dismiss path: signup → consent → home → modal appears → dismiss → modal closes → refresh → stays closed

## Testing classification

**(a) New e2e journey?**

- [x] Yes — add e2e journey for cold-start preference onboarding (new critical user path: signup → consent → preferences → home)

**(b) Coverage gate impact?**

- [x] Yes — verify 80% coverage gate for `profile_service.py` (extending existing critical-path service with 4 new methods)

## Alternatives rejected

- **Open-ended text primary (step 1)** — higher observation value, but typing at signup is too much friction. Relegated to optional step 3.
- **Single-screen vibe picker only** — lowest friction but loses mode signal and observation channel. Drops layered-goal payoff.
- **New `user_preferences` table** — cleaner domain separation but requires new service, RLS, migration, model for only 3 fields. Extending `profiles` matches `analytics_opt_out` precedent.
- **Dedicated page after consent** — full page on critical signup path; higher drop-off than modal-on-home.
- **Required step (no skip)** — violates "never block the user"; endangers Week-4 retention.
- **Re-prompt after N sessions** — nagging; user chose single-skip-never-re-prompt.
- **Store only, no consumer** — orphaned data, trust hit.
- **Light toast + store only** — manages expectations instead of delivering; worse than a real consumer.
- **Original clinical labels** (Visit purpose / Preferred vibe / Preferred area) — rejected by the user as feeling weird to new users.
- **Area / district step** — district commitment felt premature for users who move around Taipei. Replaced with optional open-text.

## Open questions / follow-ups

- **Profile settings edit UI** — users can't currently edit their preferences after signup. Flagged as a follow-up ticket, not part of this scope.
- **Shops re-rank implementation** (RPC vs in-Python sort) — decision deferred to the implementation task; start simple (in-Python sort) and profile before adding an RPC.
- **DEV-295 integration** — once the recommendation engine lands, the `preferred_vibes` and `onboarding_note` fields become additional inputs. No changes to this design are required for that.
