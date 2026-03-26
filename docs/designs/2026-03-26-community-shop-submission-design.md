# Design: Community Shop Submission Pipeline

**Date:** 2026-03-26
**Ticket:** DEV-38
**Hat:** CTO

---

## Goal

Grow the shop directory beyond the 164 seeded shops by letting authenticated users submit café Google Maps URLs. Submissions are validated, enriched via the existing pipeline, and held for admin review before going live.

## Key Decisions

- **Immediate processing** (not nightly batch) — the existing pipeline processes submissions immediately. Better UX, proven architecture.
- **Admin review gate** — user submissions land in `pending_review` after enrichment. Admin approves or rejects via the admin page.
- **5 submissions/day rate limit** per user — prevents abuse while being generous for enthusiastic users.
- **Canned rejection reasons** with auto-suggestions from pipeline data (e.g., "Permanently closed" if scrape detected it).
- **Contextual entry points** — "Know a café we're missing?" cards in search results and no-results state, linking to `/submit`.

---

## Architecture

```
User submits Google Maps URL via /submit page
        ↓
POST /api/submissions (Next.js proxy → FastAPI)
  • Validate URL format (existing regex)
  • Check 5/day rate limit for user
  • Deduplicate (existing unique constraint)
  • Create shop_submissions row + pending shop
  • Enqueue SCRAPE_SHOP (existing, immediate)
        ↓
[Existing pipeline — no changes]
  SCRAPE_SHOP → persist_scraped_data → ENRICH_SHOP → GENERATE_EMBEDDING
        ↓
[Modified] PUBLISH_SHOP handler
  • If shop.source == 'user_submission':
      → Set status = 'pending_review' (NOT 'live')
      → Update submission status to 'pending_review'
  • If shop.source != 'user_submission':
      → Existing behavior (set 'live', emit feed event)
        ↓
Admin reviews on /admin page
  • Sees enriched shop data, tags, Google Maps link
  • Pipeline auto-suggests rejection reason if available
  • Approve → set shop to 'live', emit activity feed event, update submission
  • Reject → set shop to 'rejected', store canned reason, update submission
        ↓
User sees status update on /submit page + activity feed (on approval)
```

---

## Components

### Backend Changes

| File | Change |
|------|--------|
| `backend/workers/handlers/publish_shop.py` | Route `user_submission` source to `pending_review` instead of `live` |
| `backend/api/submissions.py` | Add 5/day rate limit check (count today's submissions for user) |
| `backend/api/admin.py` (new or extend) | `POST /admin/submissions/:id/approve` and `POST /admin/submissions/:id/reject` |
| DB migration | Add `rejection_reason` column, expand status CHECK constraint, add `'pending_review'` status |

### Frontend Changes

| File | Description |
|------|-------------|
| `app/(protected)/submit/page.tsx` | New page: Google Maps URL input form + user's submission history list |
| `app/(admin)/admin/` section | New "Pending Submissions" section: table with shop name, address, tags, Google Maps link, approve/reject buttons, canned reason dropdown with auto-suggestions |
| `app/api/submissions/` | Next.js proxy routes to backend |
| `app/api/admin/submissions/` | Next.js proxy routes for admin endpoints |
| Search results component | "Know a café we're missing?" card at bottom of results |
| Search no-results state | "Can't find it? Submit a café" CTA |

---

## Data Changes

### Migration: Expand `shop_submissions`

```sql
ALTER TABLE shop_submissions
  DROP CONSTRAINT shop_submissions_status_check,
  ADD CONSTRAINT shop_submissions_status_check
    CHECK (status IN ('pending', 'processing', 'pending_review', 'live', 'rejected', 'failed'));

ALTER TABLE shop_submissions ADD COLUMN rejection_reason TEXT;
```

### Canned Rejection Reasons (frontend constant)

| Key | Display |
|-----|---------|
| `permanently_closed` | Permanently closed |
| `not_a_cafe` | Not a café |
| `duplicate` | Duplicate of existing shop |
| `outside_coverage` | Outside coverage area |
| `invalid_url` | Invalid URL |
| `other` | Other |

### Auto-Suggestion Logic

- If shop `processing_status` = `out_of_region` → pre-select "Outside coverage area"
- If scrape found "permanently closed" → pre-select "Permanently closed"
- If shop `processing_status` = `filtered_dead_url` → pre-select "Invalid URL"
- Admin can always override the suggestion

---

## API Endpoints

### Existing (modified)

**`POST /submissions`** — Add rate limit check:
```python
# Count submissions by user today
today_count = db.table("shop_submissions") \
    .select("id", count="exact") \
    .eq("submitted_by", user_id) \
    .gte("created_at", today_start_utc) \
    .execute()
if today_count.count >= 5:
    raise HTTPException(429, "You can submit up to 5 cafés per day")
```

### New

**`POST /admin/submissions/:id/approve`**
- Auth: admin role required
- Sets shop `processing_status` = `live`
- Updates submission `status` = `live`, `reviewed_at` = now
- Emits activity feed event (same as current publish_shop behavior)

**`POST /admin/submissions/:id/reject`**
- Auth: admin role required
- Body: `{ rejection_reason: string }`
- Sets shop `processing_status` = `rejected`
- Updates submission `status` = `rejected`, `rejection_reason`, `reviewed_at` = now

**`GET /admin/submissions?status=pending_review`**
- Auth: admin role required
- Returns submissions with joined shop data (name, address, tags, processing_status, source)
- Sorted by created_at ASC (oldest first)

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Rate limit exceeded (5/day) | 429 — "You can submit up to 5 cafés per day" |
| Duplicate URL | 409 — existing handling |
| Pipeline failure (scrape/enrich) | Submission status = `failed`, existing retry + dead letter |
| Admin approve on already-live shop | Idempotent no-op |
| Admin reject on already-rejected shop | Idempotent no-op |
| Invalid Google Maps URL format | 422 — existing Pydantic validation |

---

## Testing Strategy

### Backend (pytest)

- `test_submissions.py` — rate limit enforcement (submit 6th → 429), duplicate rejection (409), successful submission creates shop + enqueues job
- `test_publish_shop.py` — user_submission source routes to `pending_review`, non-submission source routes to `live`
- `test_admin_submissions.py` — approve sets `live` + emits feed event + updates submission, reject stores reason + updates status, non-admin gets 403

### Frontend (Vitest + Testing Library)

- `/submit` page — form validation (invalid URL shows error), submission success state, submission history renders with correct statuses
- Admin pending submissions — approve/reject button interactions, auto-suggested reasons display, empty state when no pending submissions
- Contextual CTAs — render at bottom of search results, render in no-results state

### Testing Classification

**(a) New e2e journey?**
- [ ] No — shop submission is a growth feature, not a critical user path at launch

**(b) Coverage gate impact?**
- [ ] No — does not touch critical-path services (search, check-in, lists). The `publish_shop` change is a minor conditional branch.
