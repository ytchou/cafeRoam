# Design: Shop Data Report Feature (DEV-262)

## Context

Users who spot incorrect shop data (wrong hours, WiFi info, name) have no way to report it. This feature adds a report button on shop detail pages, stores reports in Supabase, and batches them into a daily Linear issue for ops triage. PR #195 (FAQ copy) is blocked until this ships because the FAQ promises a report mechanism.

## Design Decisions

- **Auth:** Optional — store user_id when logged in, NULL when anonymous
- **PDPA:** user_id FK ON DELETE SET NULL (anonymize, preserve ops value)
- **Linear integration:** Full IssueTrackerProvider Protocol + LinearAdapter (provider-agnostic)
- **Frontend:** Report button in ShopActionsRow, shadcn Dialog/Sheet for form
- **Rate limiting:** 5 reports/day per IP

## Alternatives Rejected

- **Auth-gated only:** Would reduce signal from unauthenticated visitors who can already see shop data. Rejected for friction.
- **Lightweight direct Linear API call:** Breaks provider abstraction rule. Would need refactoring if reused. Rejected for consistency.
- **Below-the-fold standalone link:** Less discoverable. Rejected in favor of ShopActionsRow placement.
- **ON DELETE CASCADE for PDPA:** Would lose ops signal. Report content isn't PII. Rejected for data preservation.

## Architecture

```
User taps "回報錯誤" in ShopActionsRow
→ shadcn Dialog with field selector + free-text
→ POST /api/shops/{shopId}/report (Next.js proxy)
→ POST /shops/{shop_id}/report (FastAPI)
→ INSERT into shop_reports (user_id nullable)
→ [Daily 9am TWN cron] queries status='pending'
→ IssueTrackerProvider.create_issue() (Linear API)
→ UPDATE status='sent_to_linear'
```

## Components

### 1. Database — `shop_reports` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | gen_random_uuid() |
| `shop_id` | uuid, FK → shops | ON DELETE CASCADE |
| `user_id` | uuid, FK → auth.users, nullable | ON DELETE SET NULL (PDPA anonymize) |
| `field` | text, nullable | e.g. "hours", "wifi", "name", "other" |
| `description` | text, NOT NULL | free-text, min 5 chars |
| `status` | text, default 'pending' | pending → sent_to_linear → resolved |
| `reported_at` | timestamptz, default now() | |

RLS: public INSERT, no SELECT for non-admin. Index on (status, reported_at).

### 2. IssueTrackerProvider (3 files)

- `backend/providers/issue_tracker/interface.py` — Protocol with `create_issue(title, description, labels)`
- `backend/providers/issue_tracker/linear_adapter.py` — httpx calls to Linear GraphQL API
- `backend/providers/issue_tracker/__init__.py` — factory
- Config: `issue_tracker_provider` + `linear_api_key` + `linear_team_id` in config

### 3. Backend API — POST /shops/{shop_id}/report

- In `backend/api/shops.py`
- Pydantic: `ShopReportCreate(field: str | None, description: str)`
- Validates shop exists, description min 5 chars
- Rate limit 5/day per IP
- Uses `get_optional_user` for nullable user_id

### 4. Cron Handler — Daily Linear Digest

- `backend/workers/handlers/shop_data_report.py`
- Queries pending reports joined with shops for names
- Creates one Linear issue with markdown checklist
- Marks rows sent_to_linear
- Registered in scheduler.py: 9am Taipei, @idempotent_cron

### 5. Frontend

- ReportIssueDialog component (`components/shops/report-issue-dialog.tsx`)
- Report button (Flag icon) in ShopActionsRow
- Next.js proxy: `app/api/shops/[shopId]/report/route.ts`

## Testing Classification

- [ ] New e2e journey? No — reporting incorrect data is not a critical user path
- [x] Coverage gate impact? No — doesn't touch existing critical-path services

## Data Flow

1. User taps "回報" → Dialog opens
2. User selects optional field category + writes description
3. Submit → POST to Next.js proxy → FastAPI
4. FastAPI validates shop exists, inserts into shop_reports
5. Daily 9am cron: query pending → build markdown checklist → Linear API → mark sent_to_linear
6. Ops team triages Linear issue, resolves reports manually
