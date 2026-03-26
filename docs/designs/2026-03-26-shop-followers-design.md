# Shop Follower Subscriptions — Design (DEV-20)

_Generated: 2026-03-26 via /brainstorming_

**Scope:** User-side follow/unfollow only. Owner broadcast split to DEV-41 (blocked by DEV-19 + DEV-20).

---

## 1. Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Follow-only (no broadcast) | Shop claiming (DEV-19) is out of V1 scope; broadcast depends on it |
| Access tier | Free (any authenticated user) | Maximize follower base for social proof and future broadcast value |
| Follower count visibility | Public with 10+ threshold | Avoid embarrassing low counts; show social proof once meaningful |
| UX pattern | Heart toggle in shop detail header | Compact, familiar mobile pattern (Instagram-like) |
| Follow vs. List | Separate concepts | Different intent: follow = "I want updates", list = "I'm organizing" |
| Profile integration | "Following" section + count in header stats | Centralized follow management; profiles are private in V1 |
| Backend architecture | Simple table + COUNT(*) | Minimal complexity, appropriate for current scale (164 shops) |

---

## 2. Architecture

### Database

**New table: `shop_followers`**

```sql
CREATE TABLE shop_followers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_shop_followers_shop_id ON shop_followers(shop_id);
CREATE INDEX idx_shop_followers_user_id ON shop_followers(user_id);
```

- **RLS:** Users can INSERT/DELETE their own rows. SELECT own rows + aggregated counts.
- **PDPA cascade:** `ON DELETE CASCADE` on `user_id` ensures account deletion removes all follows.
- **Follower counts:** `SELECT COUNT(*) FROM shop_followers WHERE shop_id = $1` — no denormalized column needed at current scale.

### Component Map

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| DB | `shop_followers` table + RLS + indexes | Store follow relationships |
| Backend | `backend/services/follower_service.py` | Follow/unfollow logic, count queries, threshold check |
| Backend | `backend/api/followers.py` | REST endpoints |
| Frontend | `FollowButton` component | Heart toggle (auth-gated), optimistic UI |
| Frontend | Shop detail page | Heart in header, conditional follower count (10+ threshold) |
| Frontend | Profile page | "Following" section/tab, follow count in header stats |

---

## 3. API Endpoints

```
POST   /api/shops/{shop_id}/follow          → Follow a shop (auth required)
DELETE /api/shops/{shop_id}/follow          → Unfollow a shop (auth required)
GET    /api/shops/{shop_id}/followers/count  → Follower count + threshold visibility
GET    /api/me/following                     → List shops I follow (auth required, paginated)
```

### POST /api/shops/{shop_id}/follow

- **Auth:** Required
- **Body:** None
- **Response:** `{ "following": true, "follower_count": 42 }`
- **Idempotent:** If already following, returns current state (no error)

### DELETE /api/shops/{shop_id}/follow

- **Auth:** Required
- **Response:** `{ "following": false, "follower_count": 41 }`
- **Idempotent:** If not following, returns current state (no error)

### GET /api/shops/{shop_id}/followers/count

- **Auth:** Optional
- **Response:** `{ "count": 42, "visible": true, "is_following": false }`
  - `visible`: true only if count >= 10
  - `is_following`: included only if user is authenticated
- **Note:** Count is always returned for internal use; `visible` flag controls UI display

### GET /api/me/following

- **Auth:** Required
- **Query params:** `page` (default 1), `limit` (default 20)
- **Response:** `{ "shops": [{ "id", "name", "address", "primary_tag", "followed_at" }], "total": 15, "page": 1 }`

---

## 4. Data Flow

### Follow a shop

1. User taps heart icon on shop detail page
2. If not authenticated → login prompt (existing auth gate pattern)
3. Frontend sends `POST /api/shops/{shop_id}/follow` (optimistic: heart fills immediately)
4. Next.js proxy forwards to Python backend
5. `FollowerService.follow(user_id, shop_id)` → INSERT into `shop_followers`
6. Returns `{ following: true, follower_count: N }`
7. If INSERT fails (unique constraint) → idempotent, return current state

### Unfollow a shop

1. User taps filled heart icon
2. Frontend sends `DELETE /api/shops/{shop_id}/follow` (optimistic: heart unfills)
3. `FollowerService.unfollow(user_id, shop_id)` → DELETE from `shop_followers`
4. Returns `{ following: false, follower_count: N }`

### Shop detail page load

1. Fetch shop data (existing flow)
2. Parallel: fetch follower count + is_following status via `GET /api/shops/{shop_id}/followers/count`
3. Render heart icon (filled if following, outline if not)
4. Render follower count only if `visible: true` (count >= 10)

### Profile "Following" section

1. `GET /api/me/following?page=1&limit=20` → paginated list of followed shops
2. Profile header shows total follow count as a stat (alongside existing stats)
3. Each shop card in the following list has an unfollow option

---

## 5. Error Handling

| Scenario | Behavior |
|----------|----------|
| Double follow (race condition) | Idempotent — unique constraint catches it, return success |
| Unfollow when not following | Idempotent — DELETE affects 0 rows, return success |
| Follow deleted shop | FK constraint prevents it, return 404 |
| Network failure on follow | Optimistic UI rolls back heart state |
| Unauthenticated follow attempt | Frontend intercepts, shows login prompt |

---

## 6. Frontend Details

### FollowButton Component

- **Location:** Shop detail page header, next to shop name
- **States:** Outline heart (not following) / Filled heart (following) / Loading (disabled)
- **Auth gate:** If not authenticated, tapping heart triggers login prompt (same pattern as other auth-gated features)
- **Optimistic UI:** Toggle immediately on tap, revert on API error
- **Animation:** Subtle scale pulse on follow (0.8 → 1.2 → 1.0, 300ms)

### Follower Count Display

- **Location:** Below or next to the heart icon on shop detail page
- **Threshold:** Only display when count >= 10
- **Format:** "N followers" (e.g., "42 followers")
- **Below threshold:** Show nothing (not "0 followers" or hidden text)

### Profile Integration

- **Header stat:** Add "Following" count next to existing stats (polaroids, check-ins)
- **Section/tab:** New "Following" section showing paginated shop cards
- **Unfollow:** Each card has a heart toggle for quick unfollow
- **Empty state:** "You're not following any shops yet. Tap the heart icon on a shop page to follow it."

---

## 7. Testing Strategy

### Backend (pytest)

**Unit tests — `FollowerService`:**
- Follow a shop → creates relationship, returns count
- Unfollow a shop → removes relationship, returns count
- Follow idempotency → duplicate follow returns success, not error
- Unfollow idempotency → unfollow when not following returns success
- Follower count → correct count for shop
- Follower count threshold → `visible` flag respects 10+ threshold
- Get following list → returns paginated shops with correct data
- Follow non-existent shop → raises 404

**Integration tests — API routes:**
- Auth gating → unauthenticated requests return 401
- Full follow/unfollow cycle via API
- Pagination on /me/following

### Frontend (Vitest + Testing Library)

- `FollowButton`: renders correct state (following/not), toggles on click, shows login prompt when unauthenticated
- Profile "Following" section: renders shop list, shows empty state, total count in header
- Shop detail: heart state matches API response, conditional count display

### Testing Classification

- [ ] **New e2e journey?** No — following is an engagement feature, not a critical user path
- [ ] **Coverage gate impact?** No — new service, not modifying existing critical-path services. Aim for 80% on `follower_service.py` as good practice.

---

## 8. Spec & PRD Updates Required

After implementation:
- **SPEC.md:** Add `shop_followers` to data model section, add follower business rules (free tier, 10+ threshold)
- **PRD.md:** Add "Shop following" to in-scope features
- **Pricing strategy:** Add "Follow shops" to Free tier feature table
