# Community Notes — Explore Layer 3: Design

> **Date:** 2026-03-18
> **Status:** Approved
> **Pencil frames:** `JC0wI` (Explore section), `G7Qb0` (dedicated feed page)

---

## Core Concept

Community Notes are **highlighted check-in reviews from users with a partner/blogger role**, surfaced with a richer card treatment on the Explore page and a dedicated feed page. They are NOT a separate content type — they reuse existing `check_ins` data.

Key decisions:

- **No `community_notes` table** — query existing `check_ins` joined against `user_roles`
- **No separate writing UI** — bloggers check in and leave reviews like any user
- **Auto-publish** — all partner reviews with `review_text IS NOT NULL` appear automatically
- **Invite-only gate** — `user_roles` table controls who qualifies
- **Dedicated editorial content type** (standalone notes not tied to check-ins) is deferred to post-launch

---

## DB Schema

### Migration 1: `user_roles` table

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('blogger', 'paid_user', 'partner', 'admin')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- Service role only — admin manages roles via backend API
```

Design rationale:

- **Multiple roles per user** — a user can be both `blogger` and `paid_user`. Join table with `UNIQUE(user_id, role)` constraint.
- **Extensible role enum** — `CHECK` constraint allows `blogger`, `paid_user`, `partner`, `admin`. Add new values via migration when needed.
- **`granted_by` audit** — tracks which admin granted the role.
- **PDPA cascade** — `ON DELETE CASCADE` from `auth.users` ensures role cleanup on account deletion.

### Migration 2: `community_note_likes` table

```sql
CREATE TABLE community_note_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checkin_id, user_id)
);

CREATE INDEX idx_community_note_likes_checkin ON community_note_likes(checkin_id);

ALTER TABLE community_note_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own likes" ON community_note_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON community_note_likes
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read likes" ON community_note_likes
  FOR SELECT USING (true);
```

---

## Data Flow

```
check_ins (existing) + user_roles (new) + community_note_likes (new)
         |
    CommunityService (new)
      → joins check_ins with user_roles WHERE role = 'blogger'
      → filters to review_text IS NOT NULL
      → enriches with shop data, author profile, like count
         |
    GET /explore/community/preview (top 3)
    GET /explore/community (paginated feed)
         |
    Frontend: Explore page section + /explore/community page
```

---

## Backend

### Models (`backend/models/types.py`)

```python
class UserRole(CamelModel):
    id: str
    user_id: str
    role: str
    granted_at: datetime
    granted_by: str | None = None

class CommunityNoteAuthor(CamelModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None
    role_label: str  # "Coffee blogger", "Partner", etc.

class CommunityNoteCard(CamelModel):
    checkin_id: str
    author: CommunityNoteAuthor
    review_text: str
    star_rating: int | None = None
    cover_photo_url: str | None = None  # first check-in photo
    shop_name: str
    shop_slug: str
    shop_district: str | None = None
    like_count: int = 0
    created_at: datetime

class CommunityFeedResponse(CamelModel):
    notes: list[CommunityNoteCard]
    next_cursor: str | None = None
```

### Service (`backend/services/community_service.py`)

```python
class CommunityService:
    def __init__(self, client: Client): ...

    async def get_preview(self, limit: int = 3) -> list[CommunityNoteCard]:
        """Top 3 most recent partner reviews for Explore page section."""

    async def get_feed(self, cursor: str | None, limit: int = 10) -> CommunityFeedResponse:
        """Paginated feed of partner reviews, newest first. Cursor-based pagination."""

    async def toggle_like(self, checkin_id: str, user_id: str) -> int:
        """Insert or delete like. Returns new like count."""

    async def is_liked(self, checkin_id: str, user_id: str) -> bool:
        """Check if user has liked a note."""
```

**Query strategy:**

- Join `check_ins` → `user_roles` (WHERE `role = 'blogger'`) → `profiles` (display_name, avatar) → `shops` (name, slug, district)
- Aggregate `community_note_likes` count via subquery
- Filter: `review_text IS NOT NULL`
- Order: `check_ins.created_at DESC`
- Cursor: encode `created_at` as cursor for keyset pagination

### API Endpoints (added to `backend/api/explore.py`)

| Method | Path                                   | Auth     | Description                        |
| ------ | -------------------------------------- | -------- | ---------------------------------- |
| GET    | `/explore/community/preview`           | Public   | Top 3 cards for Explore section    |
| GET    | `/explore/community`                   | Public   | Paginated feed (`?cursor=&limit=`) |
| POST   | `/explore/community/{checkin_id}/like` | Required | Toggle like                        |
| GET    | `/explore/community/{checkin_id}/like` | Required | Check if current user liked        |

### Admin Endpoints (added to `backend/api/admin.py`)

| Method | Path                            | Auth  | Description                          |
| ------ | ------------------------------- | ----- | ------------------------------------ |
| POST   | `/admin/roles`                  | Admin | Grant role (body: `user_id`, `role`) |
| DELETE | `/admin/roles/{user_id}/{role}` | Admin | Revoke role                          |
| GET    | `/admin/roles`                  | Admin | List all role grants                 |

---

## Frontend

### Explore Page (`app/explore/page.tsx`)

Add "From the Community" section below Vibe Tags (Layer 3):

- `useCommunityPreview` SWR hook → `GET /api/explore/community/preview`
- Shows 3 compact `CommunityCard` components (matches Pencil `KJN0i` style)
- "See all →" link navigates to `/explore/community`
- Hidden when no partner reviews exist (empty state: "Community notes coming soon")

### Community Feed Page (`app/explore/community/page.tsx`)

Dedicated feed page matching Pencil `G7Qb0`:

- Back button + "From the Community" header + subtitle
- `useCommunityFeed` SWR hook → `GET /api/explore/community` with cursor pagination
- Rich `CommunityCardFull` components (hero photo, author badge, full text, shop tag, heart count)
- "Load more notes" button for pagination
- `LikeButton` component (toggle like, auth-gated)

### Components

| Component           | Location                                       | Description                                                                        |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `CommunityCard`     | `components/community/community-card.tsx`      | Compact card for Explore preview (avatar, name, text snippet, shop link)           |
| `CommunityCardFull` | `components/community/community-card-full.tsx` | Rich card for feed (cover photo, author badge, full text, shop tag, heart + count) |
| `LikeButton`        | `components/community/like-button.tsx`         | Heart icon + count, optimistic toggle, auth-gated                                  |

### Proxy Routes

- `app/api/explore/community/preview/route.ts`
- `app/api/explore/community/route.ts`
- `app/api/explore/community/[checkinId]/like/route.ts`

### SWR Hooks

- `useCommunityPreview()` — fetches 3 preview cards
- `useCommunityFeed(cursor?)` — paginated feed with `useSWRInfinite`
- `useLikeStatus(checkinId)` — check + toggle like state

---

## Error Handling

| Scenario                        | Behavior                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| No partner reviews exist        | Show empty state: "Community notes coming soon" illustration                      |
| Like toggle fails               | Optimistic UI with rollback on error                                              |
| Pagination cursor invalid       | Return first page                                                                 |
| Partner user has no review_text | Check-in excluded from feed (bare check-ins without review text are filtered out) |

---

## Testing Strategy

### Backend (pytest)

- `CommunityService`:
  - Preview returns only blogger reviews (not regular user reviews)
  - Feed pagination with cursor
  - Like toggle idempotency (double-like = unlike)
  - Empty state (no bloggers, or bloggers with no reviews)
  - Reviews without `review_text` excluded
- API routes:
  - Auth gating on like endpoint (401 for unauthenticated)
  - Public access on preview and feed endpoints
  - Cursor pagination params
- Admin roles:
  - Grant role, duplicate grant returns 409
  - Revoke role, revoke non-existent returns 404
  - List roles with filtering

### Frontend (vitest + Testing Library)

- `CommunityCard`: renders author avatar, name, text snippet, shop link
- `CommunityCardFull`: renders cover photo, heart count, full text
- `LikeButton`: toggle state, shows login prompt when unauthenticated
- Explore page: community section renders when preview data exists, hidden when empty
- Community feed page: renders cards, load more button triggers next page

---

## Analytics (PostHog)

| Event                   | Trigger                              | Properties                           |
| ----------------------- | ------------------------------------ | ------------------------------------ |
| `community_note_viewed` | Card enters viewport                 | `checkin_id`, `author_id`, `shop_id` |
| `community_note_liked`  | User hearts a note                   | `checkin_id`, `shop_id`              |
| `community_feed_opened` | User navigates to /explore/community | `referrer`                           |

---

## Open Questions (Post-Launch)

- **Dedicated editorial content type** — standalone notes not tied to check-ins (blogger writes long-form content, possibly multi-shop lists like "My 5 favorite study cafes"). Requires `community_notes` table, separate writing UI, and content moderation.
- **Comment threads** on community notes
- **Blogger profile pages** — public-facing profile for partner users
