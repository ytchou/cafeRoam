---

# Pipeline Timing Instrumentation — Design

**Date:** 2026-04-11
**Ticket:** DEV-318
**Status:** Approved

## Problem

After a pipeline enrichment run, there is no way to know how long each step took — whether LLM latency spiked, which step is the bottleneck, or how total job time compares across runs. This closes that blind spot without adding external tooling.

## Design Decisions

| Decision         | Choice                              | Rejected                                                                                       |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Execution start  | Reuse existing `claimed_at`         | Add `started_at` — negligible gap between claim and handler start                              |
| Per-step storage | `step_timings JSONB` on `job_queue` | Separate join table (join complexity), job_logs aggregation (hard to query per-job)            |
| Handler scope    | 4 main chain handlers               | All 11 handlers — most (weekly_email, account_deletion) have no interesting per-step breakdown |
| UI placement     | Expandable row detail               | New table column — clutters the table                                                          |

## Schema

One new nullable JSONB column on `job_queue`:

```sql
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS step_timings JSONB;
```

Shape written by handlers:

```json
{
  "fetch_data": { "duration_ms": 120 },
  "llm_call": { "duration_ms": 7800 },
  "db_write": { "duration_ms": 95 }
}
```

End-to-end duration: `completed_at − claimed_at` (both already exist on `job_queue`).

## Backend

### Job model (`backend/models/types.py`)

Add one field after `created_at`:

```python
step_timings: dict[str, dict[str, Any]] | None = None
```

Admin API (`GET /admin/pipeline/jobs`) already uses `SELECT *` — no endpoint changes needed.

### Handler instrumentation pattern

```python
import time

step_timings: dict[str, dict[str, int]] = {}

t0 = time.monotonic()
# ... step ...
step_timings["step_name"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

# Before log_job_event("job.end") or before returning:
try:
    await db.table("job_queue").update({"step_timings": step_timings}).eq("id", str(job_id)).execute()
except Exception:
    pass  # timing write failure must never fail the job
```

Steps timed per handler:

| Handler                | Steps                                   | Signature change?                                   |
| ---------------------- | --------------------------------------- | --------------------------------------------------- |
| `classify_shop_photos` | `fetch_photos`, `classify`, `db_write`  | Add `job_id: str \| None = None` (currently absent) |
| `enrich_shop`          | `fetch_data`, `llm_call`, `db_write`    | Already has `job_id: str \| None = None`            |
| `summarize_reviews`    | `fetch_reviews`, `llm_call`, `db_write` | Already has `job_id: str`                           |
| `generate_embedding`   | `fetch_text`, `embed_call`, `db_write`  | Already has `job_id: str \| None = None`            |

Timing write goes just before `log_job_event(..."job.end"...)` in the success path. In error paths, write partial timings collected so far before the exception propagates — useful for seeing where failure occurred.

## Frontend

`RawJobsList.tsx` changes:

1. Extend `Job` interface with three new fields:

   ```typescript
   claimed_at: string | null;
   completed_at: string | null;
   step_timings: Record<string, { duration_ms: number }> | null;
   ```

2. Add `TimingSection` component (inline in file):
   - Renders inside expandable row **before** Payload / Error / Logs sections
   - Guard: only renders when `step_timings != null && completed_at != null`
   - Total: `(Date.parse(completed_at) − Date.parse(claimed_at!))` formatted as `Xs` or `Xms`
   - Per-step proportional bars: `width = (step_ms / max_step_ms) * 100%`
   - Jobs without `step_timings` (old jobs, non-chain handlers) show no section — fully backwards-compatible

## Error Handling

- Timing write failure → silenced with `try/except`, job succeeds normally
- Partial timings on error path → collected steps written even when job ultimately fails
- Frontend → all null-guarded; old jobs without `step_timings` are invisible to this change

## Testing Strategy

- **Backend handler tests:** assert `db.table("job_queue").update({step_timings: ...})` called with expected keys
- **Admin API test:** assert `step_timings` key present and correct in job list response
- **Frontend:** two render tests — with `step_timings` (timing section visible) and without (no timing section)
- **No E2E tests:** admin-only tooling, not a critical user path

## Testing Classification

- [x] New e2e journey? **No** — admin-only tooling, no critical user path
- [x] Coverage gate impact? **No** — no critical-path services (search_service, checkin_service, lists_service) touched
- [x] E2E drift risk? **No** — no e2e tests reference admin job expansion, timing UI, or RawJobsList selectors
