# Community Feed Design (DEV-12)

Date: 2026-03-24
Ticket: [DEV-12](https://linear.app/ytchou/issue/DEV-12)

## Goal

Open the existing community feed to all authenticated users by adding a per-check-in `is_public` toggle and removing the role-based visibility gate. Add district and vibe tag filters for browsable discovery.

## Context

A working community feed already exists:
- `CommunityService` with `get_feed()` (cursor-paginated), `get_preview()`, `toggle_like()`, `is_liked()`
- `community_note_likes` table with RLS
- `/explore/community` frontend page with cards, likes, and pagination
- `CommunityCardFull` component

Current limitations:
- Feed is role-gated via `user_roles!inner(role)` join -- only bloggers/partners/admins appear
- No opt-in/opt-out mechanism for check-in authors
- No filters (district, vibe tag)

## Approach

Evolve the existing CommunityService in-place (Approach A). Alternatives considered:
- **Separate FeedService + view**: Over-engineered for current scale
- **Event-sourced feed table**: Way overkill -- triggers, denormalization, consistency concerns

## Two-Gate Access Model

1. **Author gate (write)**: `is_public` boolean on `check_ins`, toggled in check-in form, default `true`
2. **Reader gate (read)**: Auth-gated -- any authenticated user can read. Future paywall tier can restrict further.

## Role Hierarchy

| Role | Auth | Can write public check-ins | Can read community feed | Can moderate |
|------|------|---------------------------|------------------------|-------------|
| `user` (anonymous) | No | No | No | No |
| `auth-user` (signed up) | Yes | Yes | Yes | No |
| `blogger` | Yes | Yes | Yes | No |
| `partner` | Yes | Yes | Yes | No |
| `admin` | Yes | Yes | Yes | Yes |

Detailed role differentiation (permissions, badges, future paywall tier) deferred to a separate session.

## Database Changes

### Migration: add `is_public` to `check_ins`

```sql
ALTER TABLE check_ins ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- Backfill all existing check-ins as public
UPDATE check_ins SET is_public = true WHERE is_public IS NULL;

-- Partial index for feed queries
CREATE INDEX idx_check_ins_public_feed
  ON check_ins(created_at DESC)
  WHERE is_public = true;
```

### RLS update

Update `check_ins` SELECT policy so any authenticated user can read public check-ins:

```sql
CREATE POLICY "Authenticated users can read public check-ins"
  ON check_ins FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);
```

Existing policy for users reading their own check-ins remains unchanged.

## Backend Changes

### CommunityService modifications

- `get_feed()` and `get_preview()`: Replace `user_roles!inner(role)` join with `.eq("is_public", True)` filter. Keep the `user_roles` join as LEFT (for role badge display) instead of INNER (for gating).
- Add optional `district` and `vibe_tag` parameters to `get_feed()`:
  - `district`: filter via shop join `.eq("shops.district", district)`
  - `vibe_tag`: filter via taxonomy join on shop tags

### API endpoint updates

- `GET /explore/community/feed` -- add query params: `district`, `vibe_tag`, `cursor`, `limit`
- Auth-gate all community feed endpoints via `Depends(get_current_user)`
- `POST /explore/community/{checkinId}/like` -- already auth-gated, no change needed

### Check-in creation

- Accept `is_public` boolean in check-in creation payload (default `true` if omitted for backward compatibility)

## Frontend Changes

### Check-in form

- Add "Share publicly" toggle (Switch component), default on
- Submit `is_public` field with check-in payload
- Brief helper text: "Your check-in will appear in the community feed"

### Community feed page (`/explore/community`)

- Add filter bar above the card list:
  - District dropdown (populated from shops data)
  - Vibe tag chips (populated from taxonomy)
- Filters update URL query params and re-fetch feed
- Empty state when no results match filters

### Explore page preview

- Update community preview section to use new `is_public`-filtered data source (no role gate)

## Data Flow

```
Check-in submission:
  User fills form (photo + note + is_public toggle)
  -> POST /api/checkins { ..., is_public: true }
  -> FastAPI validates auth + photo + stores is_public flag
  -> Supabase INSERT into check_ins

Feed read:
  Auth user opens /explore/community
  -> GET /api/explore/community/feed?district=X&vibe_tag=Y&cursor=Z
  -> FastAPI verifies JWT via Depends(get_current_user)
  -> CommunityService.get_feed() queries:
     check_ins WHERE is_public = true
     LEFT JOIN user_roles (for badge display)
     optional .eq filters for district/vibe_tag
  -> Returns paginated CommunityNoteCard[]
```

## Error Handling

- Unauthenticated request to feed -> 401
- Invalid cursor -> ignore, return first page
- No public check-ins match filters -> empty state
- `is_public` missing on old clients -> column defaults to `true`

## Testing Strategy

### Backend (pytest)

- `CommunityService.get_feed()` returns only `is_public = true` check-ins
- Private check-ins (`is_public = false`) excluded from feed
- District filter returns only matching district
- Vibe tag filter returns only matching tags
- Auth-gate: 401 without JWT
- `toggle_like` works with new data model
- Backfill migration: all existing rows have `is_public = true`

### Frontend (Vitest + Testing Library)

- Check-in form shows public toggle, submits `is_public` field
- Community feed renders cards, handles empty state
- Filter bar updates query params and triggers re-fetch
- Unauthenticated users redirected to login

## Spec Updates

1. **PRD.md SS7**: Move "social feed" from out-of-scope to in-scope (community feed only, profiles remain private)
2. **SPEC.md SS9**: Add `is_public` business rule, update check-in social visibility rule, document role hierarchy
3. **SPEC_CHANGELOG.md** + **PRD_CHANGELOG.md**: Log entries
