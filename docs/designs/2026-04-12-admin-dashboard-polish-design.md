# Admin Dashboard UX Polish — Design Doc

**Date:** 2026-04-12
**Ticket:** DEV-321
**Status:** Approved

## Goal

Three improvements to the admin dashboard:

1. Convert the tab-based `/admin` page into a proper left-nav structure with dedicated sub-routes
2. Add a 14-day stacked bar chart to the Spend page
3. Fix spend currency formatting to always show 2 decimal places

## Architecture

### Current State

- `/admin` — single page with `<Tabs>` component (Submissions, Claims, Spend tabs)
- Left nav exists in `app/(admin)/layout.tsx` with 5 links: Dashboard, Shops, Jobs, Taxonomy, Roles
- Spend data: today/MTD totals only via `GET /admin/pipeline/spend`

### Target State

- `/admin` — summary overview (3 stat cards)
- `/admin/submissions` — SubmissionsTab content
- `/admin/claims` — ClaimsTab content
- `/admin/spend` — SpendTab + 14-day stacked bar chart
- Left nav gains 3 new items (Submissions, Claims, Spend) with section separator
- New backend endpoint `GET /admin/pipeline/spend/history?days=14`

## Components

### Backend

**New endpoint:** `GET /admin/pipeline/spend/history` in `backend/api/admin.py`

- Query param: `days: int = 14` (capped at 90)
- Queries `api_usage_log` grouped by `DATE(created_at)` and `provider`
- Handles Apify deferred cost: `compute_units × settings.apify_cost_per_cu`
- Response: `{ history: [{ date: "2026-04-01", providers: { anthropic: 1.23, openai: 0.45, apify: 0.02 } }] }`

**New Pydantic models:** `SpendHistoryEntry`, `SpendHistoryResponse`

### Frontend

**New proxy:** `app/api/admin/pipeline/spend/history/route.ts`

- Thin `proxyToBackend(request, '/admin/pipeline/spend/history')` — same pattern as existing spend proxy

**New route pages:**

- `app/(admin)/admin/submissions/page.tsx` — renders `<SubmissionsTab />`
- `app/(admin)/admin/claims/page.tsx` — renders `<ClaimsTab />`
- `app/(admin)/admin/spend/page.tsx` — renders `<SpendHistoryChart />` + `<SpendTab />`

**Modified `app/(admin)/admin/page.tsx`:**

- Remove `<Tabs>` structure
- Replace with Admin Overview: 3 stat cards (pending submissions count, pending claims count, today's spend)
- Each card links to its sub-route

**Modified `app/(admin)/layout.tsx`:**

- Add to NAV_ITEMS: Submissions (`/admin/submissions`), Claims (`/admin/claims`), Spend (`/admin/spend`)
- Add visual separator between Operations group (Submissions/Claims/Spend) and Data group (Shops/Jobs/Taxonomy/Roles)
- Update `SEGMENT_LABELS` to include the 3 new segments for breadcrumb rendering

**New component `SpendHistoryChart.tsx`:**

- Fetches `/api/admin/pipeline/spend/history?days=14`
- Recharts `BarChart` with stacked bars (stackId="a")
- Colors: Anthropic `#D97706`, OpenAI `#10A37F`, Apify `#FF5C35`
- X-axis: dates formatted as "Apr 1", Y-axis: USD
- Tooltip: total + per-provider breakdown
- Loading skeleton + error message states

**Modified `SpendTab.tsx`:**

- `formatUsd()`: change `maximumFractionDigits: 4` → `2`
- Sub-cent values (< $0.01) keep `toFixed(6)` — `$0.00` would be misleading for micro-costs

## Data Flow

```
/admin/spend page
  ├── SpendHistoryChart
  │     └── fetch /api/admin/pipeline/spend/history?days=14
  │           └── proxyToBackend → GET /admin/pipeline/spend/history
  │                 └── SELECT DATE(created_at), provider, SUM(cost_usd) FROM api_usage_log GROUP BY ...
  └── SpendTab (existing)
        └── fetch /api/admin/pipeline/spend (unchanged)
```

## Dependency

Recharts is **not** currently installed. Add via `pnpm add recharts`.

## Testing Strategy

| Layer                        | Tests                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Backend                      | `test_admin_spend_history.py`: empty history, date grouping, Apify cost calc |
| Frontend (SpendHistoryChart) | mocked fetch: chart renders, loading state, error state                      |
| Frontend (formatUsd)         | `$0.040123 → $0.04`, `$0.000001 → $0.000001` (sub-cent unchanged)            |
| Frontend (overview page)     | stat cards render with correct links                                         |

## Testing Classification

- **(a) New e2e journey?** No — admin-only, not a critical public user path
- **(b) Coverage gate impact?** No — no critical-path service touched
- **(c) E2E drift risk?** No existing E2E tests target admin routes — confirmed by grepping `e2e/`

## Alternatives Rejected

- **Redirect `/admin` to `/admin/submissions`**: Simpler but less useful — a summary landing page gives admins a faster status overview without navigating to each section.
- **Today-vs-MTD grouped bar chart**: Would work with existing API data but is less useful than a 14-day trend view. Backend cost is minimal (same table, different GROUP BY).
- **Grouped bars (non-stacked)**: Bars become too narrow at 14-day scale with 3 providers.
