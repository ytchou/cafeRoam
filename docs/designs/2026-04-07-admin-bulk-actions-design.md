# Admin Bulk Actions Design — DEV-291 + DEV-288

Date: 2026-04-07

## Overview

Two admin tables (ShopTable and SubmissionsTab) gain a shared bulk-action pattern: multi-select checkboxes, a context-aware toolbar, and per-row action menus. Covers retry/approve/reject for shops and approve/reject for community submissions.

Merges DEV-291 (Retry button for stuck shops) and DEV-288 (bulk approve/reject for SubmissionsTab) since both require the same underlying pattern.

## Architecture

### Backend — 4 new endpoints

| Endpoint                            | File                         | Description                                   |
| ----------------------------------- | ---------------------------- | --------------------------------------------- |
| `POST /admin/shops/retry`           | `backend/api/admin_shops.py` | Reset retryable shops → pending               |
| `POST /admin/shops/bulk-reject`     | `backend/api/admin_shops.py` | Reject pending_review shops with reason       |
| `POST /admin/pipeline/approve-bulk` | `backend/api/admin.py`       | Bulk approve community submissions            |
| `POST /admin/pipeline/reject-bulk`  | `backend/api/admin.py`       | Bulk reject community submissions with reason |

All endpoints follow the existing `bulk-approve` pattern:

- Accept `shop_ids`/`submission_ids` list (max 50); some accept `None` = all eligible
- Use conditional `.in_("processing_status", eligible)` updates as TOCTOU guard
- Log all actions via `log_admin_action()`
- Return `{ N, skipped: M }` shape

### Frontend — 2 component updates + 4 new proxy routes

New proxy routes (passthrough via `proxyToBackend`):

- `app/api/admin/shops/retry/route.ts`
- `app/api/admin/shops/bulk-reject/route.ts`
- `app/api/admin/pipeline/approve-bulk/route.ts`
- `app/api/admin/pipeline/reject-bulk/route.ts`

Component updates:

- **ShopTable**: generalized multi-select (remove `isReviewFilter` gate) + row actions menu + bulk toolbar (Approve/Reject/Retry)
- **SubmissionsTab**: add multi-select checkboxes + bulk approve/reject toolbar with shared rejection reason picker

## Components

### Request/Response Models

```python
# admin_shops.py
class RetryShopsRequest(BaseModel):
    shop_ids: list[str] | None = None  # None = all eligible, capped at 200

class BulkRejectShopsRequest(BaseModel):
    shop_ids: list[str]
    rejection_reason: RejectionReasonType  # imported from api.admin

# admin.py
class BulkApproveSubmissionsRequest(BaseModel):
    submission_ids: list[str]

class BulkRejectSubmissionsRequest(BaseModel):
    submission_ids: list[str]
    rejection_reason: RejectionReasonType
```

### Retryable Statuses

```python
RETRYABLE_STATUSES = {
    ProcessingStatus.SCRAPING,
    ProcessingStatus.ENRICHING,
    ProcessingStatus.EMBEDDING,
    ProcessingStatus.PUBLISHING,
    ProcessingStatus.TIMED_OUT,
    ProcessingStatus.FAILED,
}
```

Non-retryable (skip silently): `PENDING` (no-op), `PENDING_REVIEW` (awaiting review), `LIVE`, `FILTERED_DEAD_URL`.

### Row Actions Menu (ShopTable)

Context-sensitive 3-dot (`MoreHorizontal`) icon button at the end of each row:

- `pending_review` → **Approve**, **Reject** (with reason picker)
- Any status in `RETRYABLE_STATUSES` → **Retry**
- Otherwise → button hidden

Per-row actions call the same handlers as bulk (with a single-item array).

## Data Flow

**Retry (shops):**

```
ShopTable toolbar/row menu
  → POST /api/admin/shops/retry { shop_ids: [id] | null }
  → backend: filter by RETRYABLE_STATUSES
  → conditional UPDATE processing_status → pending (TOCTOU guard)
  → log_admin_action
  → return { reset: N, skipped: M }
  → toast "N shop(s) reset to pending" (+ ", M skipped" when M > 0)
  → clear selection, onRefresh()
```

**Bulk reject (shops):**

```
ShopTable toolbar/row menu → rejection reason picker (ConfirmDialog)
  → POST /api/admin/shops/bulk-reject { shop_ids, rejection_reason }
  → backend: filter pending_review only
  → UPDATE processing_status → rejected
  → cancel_shop_jobs() RPC for each rejected shop
  → update linked submission if exists (status → rejected + reason)
  → log_admin_action
  → return { rejected: N, skipped: M }
```

**Bulk approve (submissions):**

```
SubmissionsTab toolbar
  → POST /api/admin/pipeline/approve-bulk { submission_ids }
  → backend: iterate per-submission (same logic as single approve)
  → conditional UPDATE submission → live, shop → live (TOCTOU guard)
  → emit activity_feed event for user-submitted shops
  → log_admin_action
  → return { approved: N, skipped: M, failed: [] }
```

**Bulk reject (submissions):**

```
SubmissionsTab toolbar → rejection reason picker
  → POST /api/admin/pipeline/reject-bulk { submission_ids, rejection_reason }
  → backend: iterate per-submission (same logic as single reject)
  → cancel_shop_jobs() RPC + UPDATE submission + shop → rejected
  → log_admin_action
  → return { rejected: N, skipped: M }
```

## Error Handling

| Scenario                 | Backend response               | Frontend behavior                               |
| ------------------------ | ------------------------------ | ----------------------------------------------- |
| `shop_ids.length > 50`   | 400 `"Maximum 50 per request"` | `toast.error(data.detail)`                      |
| Concurrent status change | Counted as skipped, not error  | Shown in skipped count                          |
| Network failure          | —                              | `toast.error('Network error')`                  |
| Non-200 response         | `{ detail: string }`           | `toast.error(data.detail \|\| 'Action failed')` |
| Partial success          | `{ N, skipped: M }`            | `"3 reset to pending, 1 skipped"`               |

## Testing Strategy

### Backend (pytest + TestClient + MagicMock)

**`test_admin_shops.py`** — new test class `TestAdminShopsRetry`:

- Retryable shops reset to pending; count returned correctly
- Non-retryable statuses (live, pending_review) counted as skipped
- Empty result when all shops are skipped
- 400 when `shop_ids` list exceeds 50

**`test_admin_shops.py`** — new test class `TestAdminShopsBulkReject`:

- `pending_review` shops rejected with reason persisted
- Non-`pending_review` shops counted as skipped
- 400 when list exceeds 50

**`test_admin.py`** — new test class `TestBulkApproveSubmissions`:

- Submissions approved; shop set to live; activity feed emitted for user-submitted
- Already-live submissions skipped
- 400 when list exceeds 50

**`test_admin.py`** — new test class `TestBulkRejectSubmissions`:

- Submissions rejected; `rejection_reason` persisted on submission; shop set to rejected
- Already-rejected submissions skipped
- 400 when list exceeds 50

### Frontend (Vitest + Testing Library)

- ShopTable: checkboxes always visible (not gated by filter), row actions menu appears with correct items per status, bulk toolbar shows/hides correctly, retry/reject handlers called with correct payloads
- SubmissionsTab: checkboxes per row, select-all works, bulk toolbar appears when ≥1 selected, bulk approve/reject call correct endpoints

### Testing Classification

**(a) New e2e journey?**

- [ ] No — admin-only operational flow, not a critical user path

**(b) Coverage gate impact?**

- [ ] No — admin endpoints don't touch `search_service`, `checkin_service`, or `lists_service`

## Alternatives Rejected

- **Row actions only (no bulk)**: Too slow for processing backlogs of timed_out shops
- **Retry via detail page only**: Requires navigating per-shop; fine for one-off but not batch recovery
- **Keep `isReviewFilter` gate on multi-select**: Would require a parallel "retry mode" prop — generalizing multi-select is cleaner and more maintainable
- **Separate endpoints for bulk vs single**: Single-item array reuses the same endpoint, keeping API surface minimal
