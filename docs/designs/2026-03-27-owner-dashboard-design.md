# Design: Owner Dashboard + Shop Story (DEV-21)

Date: 2026-03-27
Ticket: DEV-21
Depends on: DEV-45 (merged — `shop_claims`, `shop_owner` role)
Blocks: DEV-35 (paid shop tiers, future)

---

## Goal

Give verified shop owners a dedicated dashboard to view analytics, edit their shop's public profile, curate taxonomy tags, and respond to reviews. Add a public-facing "From the Owner" story section on the shop detail page.

---

## Scope (V1 — free claimed tier only)

| Feature | In scope |
|---------|----------|
| Owner dashboard route `/owner/[shopId]/dashboard` | Yes |
| Overview stats (check-ins, followers, saves, page views) | Yes |
| Search insights via PostHog Query API | Yes |
| Community pulse (anonymized visitor tags) | Yes |
| Relative ranking in district | Yes |
| Edit shop info (hours, description, photos) | Yes |
| Owner-curated tags (max 10) | Yes |
| Review responses | Yes |
| Public shop story on shop detail page | Yes |
| Events, announcements, featured menu items | No — DEV-35 (premium) |
| Follower messaging / broadcast | No — DEV-41 (premium) |

---

## Architecture

### Dependency Chain

```
DEV-45 (shop_claims + shop_owner role)
  └─► DEV-21 (owner dashboard + shop story)
        └─► DEV-35 (paid tiers: events, announcements, featured items)
```

### DEV-45 Foundation (what we build on)

- `shop_claims` table: `(id, shop_id, user_id, status, contact_name, contact_email, role, proof_photo_url, rejection_reason, reviewed_at, reviewed_by)`
- `user_roles` CHECK constraint includes `shop_owner` role
- `approve_claim()` upserts `user_roles` with `role = 'shop_owner'`
- Shops query already joins `shop_claims` and exposes `claimStatus` in API response
- Approval email links to `/owner/{shop_id}/dashboard` (currently 404 — this ticket fixes it)

---

## Database Schema

### `shop_content` table

```sql
CREATE TABLE shop_content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES auth.users(id),
  content_type  TEXT NOT NULL DEFAULT 'story'
                  CHECK (content_type IN ('story')),  -- expand to 'event'|'announcement'|'featured_item' in DEV-35
  title         TEXT,
  body          TEXT NOT NULL,
  photo_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, content_type)  -- one story per shop
);

-- RLS: owners can manage their own content; public can read published stories
CREATE POLICY "owner_manage" ON shop_content
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "public_read_published" ON shop_content
  FOR SELECT USING (is_published = true);
```

### `shop_tags` table (owner-curated tags)

```sql
CREATE TABLE shop_owner_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL REFERENCES auth.users(id),
  tag        TEXT NOT NULL,  -- from existing taxonomy only
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, tag)
);
-- Max 10 tags per shop enforced at service layer
```

### `review_responses` table

```sql
CREATE TABLE review_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id  UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id),
  owner_id    UUID NOT NULL REFERENCES auth.users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (checkin_id)  -- one response per review
);
```

---

## Backend

### New Dependency: `require_shop_owner`

Add to `backend/api/deps.py`:

```python
async def require_shop_owner(
    shop_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_admin_db),
) -> dict:
    """Verify user has shop_owner role AND an approved claim for this specific shop."""
    claim = db.table("shop_claims")
        .select("id")
        .eq("shop_id", shop_id)
        .eq("user_id", user["id"])
        .eq("status", "approved")
        .maybe_single()
        .execute()
    if not claim.data:
        raise HTTPException(status_code=403, detail="Not the verified owner of this shop")
    return user
```

### New Service: `owner_service.py`

| Method | Description |
|--------|-------------|
| `get_dashboard_stats(shop_id)` | Returns check-in count, follower count, saves-to-list, page views (PostHog HogQL) |
| `get_search_insights(shop_id)` | PostHog HogQL: top 5-10 queries that surfaced this shop (rolling 30d) |
| `get_community_pulse(shop_id)` | Anonymized: recent check-in taxonomy tags + activity counts |
| `get_ranking(shop_id)` | Relative rank by attribute within district (top 3) |
| `get_shop_story(shop_id)` | Fetch published `shop_content` row with `content_type = 'story'` |
| `upsert_shop_story(shop_id, owner_id, data)` | Create or update story |
| `update_shop_info(shop_id, owner_id, data)` | Update shops table: hours, description, photos |
| `get_owner_tags(shop_id)` | Fetch `shop_owner_tags` for this shop |
| `update_owner_tags(shop_id, owner_id, tags)` | Replace tag set (max 10, must be in taxonomy) |
| `get_reviews(shop_id, page)` | Paginated check-ins with notes for this shop |
| `upsert_review_response(checkin_id, shop_id, owner_id, body)` | Create or update response |

### New Router: `backend/api/owner.py`

| Method | Endpoint | Auth |
|--------|----------|------|
| `GET` | `/owner/{shop_id}/dashboard` | `require_shop_owner` |
| `GET` | `/owner/{shop_id}/analytics` | `require_shop_owner` |
| `GET` | `/owner/{shop_id}/story` | `require_shop_owner` |
| `PUT` | `/owner/{shop_id}/story` | `require_shop_owner` |
| `PATCH` | `/owner/{shop_id}/info` | `require_shop_owner` |
| `GET` | `/owner/{shop_id}/tags` | `require_shop_owner` |
| `PUT` | `/owner/{shop_id}/tags` | `require_shop_owner` |
| `GET` | `/owner/{shop_id}/reviews` | `require_shop_owner` |
| `POST` | `/owner/{shop_id}/reviews/{checkin_id}/response` | `require_shop_owner` |

### PostHog Query API (HogQL)

Page views query:
```sql
SELECT count() as views
FROM events
WHERE event = '$pageview'
  AND properties.$current_url LIKE '%/shops/{shop_id}%'
  AND timestamp >= now() - interval 30 day
```

Search terms query:
```sql
SELECT properties.query as query, count() as impressions
FROM events
WHERE event = 'search_result_shown'
  AND JSONExtractArrayRaw(properties.shop_ids, 0) LIKE '%{shop_id}%'
  AND timestamp >= now() - interval 30 day
GROUP BY query
ORDER BY impressions DESC
LIMIT 10
```

Privacy: queries are aggregate counts only — no user IDs, no emails.

---

## Frontend

### New Route: `/owner/[shopId]/dashboard`

- Protected: redirect to `/login` if unauthenticated; redirect to `/` if authenticated but not `shop_owner` for this shop
- Fetches all dashboard data from `/owner/{shop_id}/dashboard` and `/owner/{shop_id}/analytics`
- Mobile: collapsible sections (accordion)
- Desktop: sidebar nav + main content area

### Dashboard Sections (in order)

| # | Section | Data source |
|---|---------|-------------|
| 1 | Overview | Supabase (check-ins, followers, saves) + PostHog (page views) |
| 2 | Search Insights | PostHog HogQL (top queries) |
| 3 | Community Pulse | Supabase check-in tags (anonymized) |
| 4 | Your Ranking | Computed: search frequency + check-in volume by district |
| 5 | Shop Info | Editable form — hours, description, photos |
| 6 | Tags | Curated taxonomy tags with "Shop owner confirmed" badge |
| 7 | Reviews | Paginated check-in notes with response composer |

Empty state rule: every empty section must include a concrete action (share link, add tags, update info, etc.) — never "nothing here yet."

### Public Shop Detail Page: `OwnerStory`

New component inserted between `ShopDescription` and `AttributeChips` in `shop-detail-client.tsx`:

```tsx
// Publicly visible — no auth gate
// Hidden entirely if no published story exists
<OwnerStory shopId={shop.id} story={shop.ownerStory} />
```

- Fetched alongside shop detail data (shop story included in `/shops/{id}` response)
- Shows: "From the Owner" heading + verified badge icon + story body + optional photo
- If `is_published = false` or no story: component returns null (not visible to public)
- If owner is viewing their own shop: shows inline "Edit your story →" CTA linking to dashboard

---

## Auth & Access Control

| Context | Behavior |
|---------|---------|
| Unauthenticated user visits `/owner/[shopId]/dashboard` | Redirect to `/login?next=/owner/{shopId}/dashboard` |
| Authenticated user with no claim | 403 → redirect to `/` with toast: "This dashboard belongs to the shop owner" |
| Owner visits their own shop detail page | Show inline "Edit your story →" CTA |
| Unclaimed shop | `ClaimBanner` stays (DEV-45 component, no changes needed) |

---

## PDPA Compliance

- Dashboard never shows individual user data (usernames, emails, user IDs)
- All analytics are aggregate counts or anonymized tag frequencies
- `community_pulse` shows: "3 visitors tagged '安靜工作空間' this week" — no attribution
- Review responses: owners can see review text (users consented at check-in), not reviewer identity

---

## Testing Classification

**(a) New e2e journey?**
- [x] Yes — add e2e journey: verified owner visits `/owner/{shopId}/dashboard`, views stats, edits shop story, story appears on public shop page

**(b) Coverage gate impact?**
- [x] Yes — `owner_service.py` is a new critical-path service. Verify 80% coverage gate.

---

## Out of Scope → DEV-35

- `content_type IN ('event', 'announcement', 'featured_item')` — schema ready, UI/API deferred
- `starts_at` / `ends_at` fields on `shop_content` — add in DEV-35
- Follower messaging / broadcast — DEV-41
- Sponsored placement in search — DEV-35
