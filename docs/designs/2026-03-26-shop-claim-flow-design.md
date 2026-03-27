# Design: Shop Claim Flow + Verified Badge (DEV-45)

_Generated: 2026-03-26 via /brainstorming_

---

## Overview

Build the claim flow that lets shop owners claim their CafeRoam page — from the "Claim this page" badge through admin verification to the Verified badge. This is PR1 of the shop owner claimed tier. PR2 (owner dashboard + tags) is DEV-63, blocked by this ticket.

**Related:** DEV-19 (strategy), DEV-63 (dashboard + tags, blocked by this), DEV-35 (paid shop tiers, future)

---

## Architecture

Two-layer: Next.js frontend (thin proxy + UI) → FastAPI backend (all business logic).

```
[ClaimBanner] → /shops/[shopId]/claim (Next.js page)
  → POST /api/claims → backend POST /claims
      → shop_claims insert (status=pending)
      → proof photo upload (presigned Supabase Storage URL)
      → email: confirmation to owner + notification to admin

[Admin /admin panel, Claims tab]
  → GET /api/admin/claims → backend GET /admin/claims
  → POST /api/admin/claims/:id/approve → backend
      → UPDATE shop_claims SET status=approved
      → INSERT user_roles (user_id, 'shop_owner')
      → email: approval + dashboard link to owner
  → POST /api/admin/claims/:id/reject
      → UPDATE shop_claims SET status=rejected, rejection_reason=...
      → email: rejection + reason to owner

[ShopDetailPage] — reads claim status via shop API
  → shows VerifiedBadge if shop has approved claim
  → hides ClaimBanner if shop has pending or approved claim
```

---

## Database Schema

### Migration 1: `user_roles` — align with 6-level role hierarchy

The existing `user_roles` table stores special/elevated roles. The constraint is updated to:

- Rename `paid_user` → `member` (aligns with SPEC.md §9 terminology)
- Add `shop_owner` (new role for DEV-45)

Role hierarchy (SPEC.md §9):

- **Implicit/Supabase Auth:** `user` (anonymous), `auth-user` (signed in, free tier)
- **Stored in `user_roles`:** `member` (paid subscription), `blogger`, `partner`, `shop_owner`, `admin`

```sql
-- Rename paid_user → member
UPDATE user_roles SET role = 'member' WHERE role = 'paid_user';

ALTER TABLE user_roles
  DROP CONSTRAINT user_roles_role_check,
  ADD CONSTRAINT user_roles_role_check
    CHECK (role IN ('blogger', 'partner', 'admin', 'shop_owner', 'member'));
```

**Backend audit required:** Search all backend code for `'paid_user'` and update to `'member'`.

### Migration 2: `shop_claims` table

```sql
CREATE TABLE shop_claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  contact_name     TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  proof_photo_url  TEXT NOT NULL,   -- Supabase Storage path in claim-proofs bucket
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)  -- one active claim per shop
);

CREATE INDEX idx_shop_claims_user   ON shop_claims(user_id);
CREATE INDEX idx_shop_claims_status ON shop_claims(status) WHERE status = 'pending';

-- RLS
ALTER TABLE shop_claims ENABLE ROW LEVEL SECURITY;
-- Users can read their own claim
CREATE POLICY "users read own claim" ON shop_claims
  FOR SELECT USING (auth.uid() = user_id);
-- Users can insert a claim (uniqueness constraint prevents duplicates)
CREATE POLICY "users insert own claim" ON shop_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admins can read all (via service role in backend)
```

### Supabase Storage

- **Bucket:** `claim-proofs` (private)
- **Access:** Service role only — admin gets a signed URL via backend endpoint
- **PDPA:** Proof photos (business cards, personal photos) must not be publicly accessible

---

## Backend

### New service: `backend/services/claims_service.py`

| Method                                                        | Responsibility                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `get_presigned_upload_url(shop_id, user_id)`                  | Returns signed Supabase Storage upload URL for proof photo                                        |
| `submit_claim(user_id, shop_id, form_data, proof_photo_path)` | Inserts `shop_claims` record (status=pending), sends confirmation email, sends admin notification |
| `get_claim_by_shop(shop_id)`                                  | Returns claim record for a shop (used by shop API to include claim_status)                        |
| `approve_claim(claim_id, admin_user_id)`                      | Updates status=approved, inserts `shop_owner` role, sends approval email with dashboard link      |
| `reject_claim(claim_id, reason, admin_user_id)`               | Updates status=rejected, sets rejection_reason, sends rejection email                             |

### New API: `backend/api/claims.py`

| Route                             | Auth     | Description                                                          |
| --------------------------------- | -------- | -------------------------------------------------------------------- |
| `GET /claims/upload-url?shop_id=` | Required | Returns presigned Supabase Storage upload URL                        |
| `POST /claims`                    | Required | Submit claim (validates no existing pending/approved claim for shop) |
| `GET /claims/me?shop_id=`         | Required | Get user's own claim status for a shop                               |

### Admin extensions: `backend/api/admin.py`

| Route                             | Auth  | Description                                   |
| --------------------------------- | ----- | --------------------------------------------- |
| `GET /admin/claims`               | Admin | List claims (filter: status, default=pending) |
| `GET /admin/claims/:id/proof-url` | Admin | Get signed URL for proof photo                |
| `POST /admin/claims/:id/approve`  | Admin | Approve claim                                 |
| `POST /admin/claims/:id/reject`   | Admin | Reject claim with required reason             |

### Shop API change: `backend/api/shops.py`

- Extend shop detail response to include `claim_status: null | "pending" | "approved"`
- JOIN `shop_claims` on `shop_id` — no boolean cache on `shops` table (avoids sync issues on revocation)

---

## Frontend

### New page: `/shops/[shopId]/claim`

Full-page form (consistent with `/submit` pattern). Redirects to login with return URL if unauthenticated.

**Fields:**

- Contact name (text, required)
- Email (email, required)
- Role (select: 店主/Owner, 店長/Manager, 員工/Staff)
- Proof photo upload (file, required, max 10MB, accepts image/\*)
  - Helper text: 在店內拍的照片、名片、有店名的菜單、或 Google 商家截圖

**On submit:** Show "已送出認領申請 — 48小時內回覆" confirmation state.

**PostHog events:**

- `claim_form_viewed` (shop_id)
- `claim_form_submitted` (shop_id)

### Updated: `components/shops/claim-banner.tsx`

- Replace mailto link with `/shops/[shopId]/claim` navigation
- Hide if `claim_status` is `'pending'` or `'approved'` (shop already claimed/in review)
- PostHog event: `claim_badge_clicked` (shop_id, shop_name)

### New component: `components/shops/verified-badge.tsx`

- Displayed on shop detail page header when `claim_status === 'approved'`
- Displayed on search result cards (small inline badge)
- Displayed in directory listing (visual indicator)
- Text: "已認證" with a checkmark icon

### Admin panel: `app/(admin)/admin/`

- Add "Claims" tab alongside existing "Submissions" tab
- Claims list: contact_name, contact_email, shop_name, role, submitted_at, status
- Claim detail: proof photo viewer (signed URL), approve button, reject button with reason dropdown
- Reuse rejection UX pattern from submissions (canned reasons: invalid_proof, not_an_owner, duplicate_request, other)

---

## Email Templates (via Resend, existing provider)

| Trigger         | To    | Subject                           |
| --------------- | ----- | --------------------------------- |
| Claim submitted | Owner | 認領申請已收到 — 48小時內回覆     |
| Claim submitted | Admin | [CafeRoam] New claim: {shop_name} |
| Claim approved  | Owner | 已通過認領 — 前往您的管理後台     |
| Claim rejected  | Owner | 認領申請未通過                    |

Approval email includes direct link to `/owner/{shopId}/dashboard` (DEV-63, not built yet — link goes to a "coming soon" placeholder in the interim).

---

## Error Handling

| Scenario                                                      | Handling                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Shop already has pending/approved claim                       | 409 from backend → frontend shows "此咖啡廳已有待審核或已通過的申請"            |
| Unauthenticated user clicks claim badge                       | Redirect to login with `?next=/shops/[shopId]/claim` return URL                 |
| Proof photo > 10MB                                            | Validate on frontend before upload; backend rejects at presigned URL generation |
| Admin rejects without reason                                  | Required field in reject modal — cannot submit empty                            |
| Claim approved for a shop with existing `shop_owner` role row | `INSERT ... ON CONFLICT DO NOTHING` on user_roles                               |

---

## PostHog Events

| Event                  | Properties                | Fired by |
| ---------------------- | ------------------------- | -------- |
| `claim_badge_clicked`  | shop_id, shop_name        | Frontend |
| `claim_form_viewed`    | shop_id                   | Frontend |
| `claim_form_submitted` | shop_id                   | Frontend |
| `claim_approved`       | shop_id, claim_id         | Backend  |
| `claim_rejected`       | shop_id, claim_id, reason | Backend  |

---

## Testing Classification

**(a) New e2e journey?**

- [x] Yes — add e2e journey: shop owner claim flow (badge visible → click → form → submit → confirmation state). Add to `/e2e-smoke`.

**(b) Coverage gate impact?**

- [x] Yes — `claims_service.py` is a new critical-path service. Verify 80% coverage gate for submit, approve, reject paths.

---

## Out of Scope (→ DEV-63)

- Owner dashboard (`/owner/[shopId]/dashboard`)
- Shop info editing by owner
- Owner-curated taxonomy tags + search ranking boost
- Review responses
- Dashboard analytics (page views, search insights, community pulse, ranking)
- Empty states for dashboard sections

---

## Key Decisions

| Decision                | Choice                                                                         | Rationale                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Proof photo storage     | Private Supabase Storage bucket (`claim-proofs`)                               | PDPA — business cards and personal photos must not be publicly accessible     |
| Proof photo upload      | Direct from browser (presigned URL)                                            | Consistent with check-in photo pattern; no double bandwidth                   |
| Ownership authorization | `shop_claims` JOIN (not a cached boolean on `shops`)                           | Avoids sync issues if claim ever revoked; negligible cost at <500 shops       |
| Admin UI                | Extend existing `/admin` panel with Claims tab                                 | Reuse established approval/rejection UX patterns                              |
| Claim form UX           | Full page `/shops/[shopId]/claim`                                              | Consistent with `/submit` pattern; better mobile space for photo upload       |
| Role model              | `shop_owner` role in `user_roles` + `shop_claims` as per-shop ownership record | JWT-accessible role for global check; claims table for per-shop authorization |
