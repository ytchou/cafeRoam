# Plan: Jobs Queue Operator Tooling (DEV-307 + DEV-308 + DEV-311)

## Context

Three Linear tickets, shipped together in a single PR because they share files and their correctness is coupled:

- **DEV-307** — Operator needs a "Force fail" action on stuck/runaway batches in the Jobs Queue UI.
- **DEV-311** — Bug: in-flight workers currently claim a job, spend minutes on LLM calls, then blindly write results back to `shops` — overwriting any admin cancellation that happened in the meantime. The admin's force-fail is silently undone.
- **DEV-308** — Operator can't debug failed batches from the UI — needs per-job structured logs (start/end, LLM provider per call, DB writes, errors) visible inline.

**Why ship together:** DEV-311 is a direct correctness consequence of exposing DEV-307 to operators. Without the cancellation check, the new force-fail button is misleading. DEV-308 shares the same API layer and UI components (`RawJobsList.tsx`, admin.py).

**Intended outcome:** An operator watching a hybrid-LLM enrichment batch in staging can (a) see per-job milestone logs updating live, (b) force-fail a stuck job and trust that in-flight workers won't undo it, and (c) see the shop correctly marked `failed` with the operator's reason.

---

## Design Decisions (locked)

| # | Decision | Chosen | Rejected alternatives |
|---|----------|--------|----------------------|
| 1 | Force-fail API | **Extend existing `POST /api/admin/pipeline/jobs/{id}/cancel`** with optional `reason` body param. UI button relabeled "Force fail". | New `/force-fail` endpoint (two code paths) |
| 2 | Status semantics | **New `cancelled` status** for operator force-fails. `dead_letter` stays for retry-exhaustion only. Clean query split: `WHERE status='cancelled'` = all operator actions. | Keep `dead_letter` for both (distinguish via `cancelled_at IS NOT NULL`); rename `dead_letter` → `cancelled` (largest migration) |
| 3 | New columns | **Add `cancelled_at`, `failed_at`, `cancel_reason`** to `job_queue`. `cancelled_at` set when operator cancels (→ `cancelled`); `failed_at` set on terminal `failed`/`dead_letter`; `cancel_reason` stores free-text operator reason. | No new columns (last_error string only) |
| 4 | DEV-311 cancellation check | **Pre-write status re-read** — each handler re-fetches `job_queue.status` before committing to `shops`. If not `claimed`, abort the write. | Atomic CTE update (too invasive); mid-LLM polling (overengineered) |
| 5 | DEV-308 log transport | **Polling** `GET /api/admin/pipeline/jobs/{id}/logs` every 3s while row expanded AND job running. | SSE (new infra); on-expand snapshot only |
| 6 | PR scope | **Single PR, all three tickets** | Split into 2 or 3 PRs (overlapping files) |
| 7 | Shop side-effect on force-fail | **Set `shop.processing_status = 'failed'` + `rejection_reason`** from operator's reason. | Leave shop state untouched; reset to `pending` |
| 8 | Log granularity | **Milestones only** — `job.start`, `llm.call` (provider+model), `db.write`, `error`, `job.end`. ~5–10 lines per job. | Verbose every-log-line; errors+LLM only |
| 9 | Reason codes | **Free-text `cancel_reason` for now**; structured enum deferred to separate ticket (DEV-3xx). | Structured codes now (out of scope) |

---

## Architecture Overview

```
Operator clicks Force Fail (RawJobsList.tsx)
  → ConfirmDialog with reason input
  → POST /api/admin/pipeline/jobs/{id}/cancel { reason }
      → admin.py cancel_job:
          1. UPDATE job_queue SET status='dead_letter', last_error=reason WHERE status IN (pending,claimed)
          2. UPDATE shops SET processing_status='failed', rejection_reason=reason WHERE id=job.payload.shop_id
          3. log_admin_action('force_fail_job', job_id, {reason})
          4. INSERT job_logs (level='warn', message='Cancelled by admin', context={reason, admin_id})

Meanwhile, in-flight worker finishes its LLM call:
  enrich_shop.py / generate_embedding.py / summarize_reviews.py
    → NEW: guard helper `check_job_still_claimed(db, job_id)`
    → if not claimed: log 'job.aborted_midflight' to job_logs, early return (skip shops write)
    → else: normal write path + log 'db.write' milestone

Frontend polls logs while expanded:
  RawJobsList row-expanded + job.status='claimed'
    → useEffect setInterval(3000) → GET /api/admin/pipeline/jobs/{id}/logs?after={last_ts}
    → append new lines to the expanded panel
    → clears interval when job reaches terminal state
```

---

## Files to Change

### Database (1 migration)
- **NEW** `supabase/migrations/20260410000001_jobs_queue_cancelled_status_and_audit_columns.sql`
  - Add `cancelled` to the `job_queue.status` CHECK constraint (alongside pending, claimed, completed, failed, dead_letter)
  - Add columns: `cancelled_at TIMESTAMPTZ`, `failed_at TIMESTAMPTZ`, `cancel_reason TEXT`
  - Update `JobStatus` Python enum: add `CANCELLED = "cancelled"`
  - Existing `cancel_job` flow (dead_letter) must be migrated to write `cancelled` instead — existing `dead_letter` rows from cancels are a known exception; no backfill needed

- **NEW** `supabase/migrations/20260410000002_create_job_logs.sql`
  - `job_logs` table: `id uuid PK`, `job_id uuid NOT NULL`, `level text CHECK (info|warn|error)`, `message text NOT NULL`, `context jsonb DEFAULT '{}'`, `created_at timestamptz DEFAULT now()`
  - Index `(job_id, created_at DESC)`
  - RLS: deny all (server-side only, service-role access via admin auth)
  - Note: **No retention cron in this PR** — milestones-only keeps volume <20 rows/job.

### Backend — new helper
- **NEW** `backend/workers/job_log.py`
  - `async def log_job_event(db, job_id, level, message, **context) -> None`
  - Single insert to `job_logs` table. Swallows errors (log sink must not break the worker).
  - Tests: `backend/tests/workers/test_job_log.py`

- **NEW** `backend/workers/job_guard.py`
  - `async def check_job_still_claimed(db, job_id) -> bool`
  - SELECT status FROM job_queue WHERE id = job_id. Returns True iff status='claimed'.
  - Tests: `backend/tests/workers/test_job_guard.py`

### Backend — admin API
- **MODIFY** `backend/api/admin.py` (around line 617–656, `cancel_job`)
  - Add `reason: Optional[str] = Body(None)` param.
  - Default reason = `"Cancelled by admin"` when not provided.
  - Change status transition: `dead_letter` → **`cancelled`**; set `cancelled_at=NOW()`, `cancel_reason=reason`.
  - After updating `job_queue`, look up `job.payload.shop_id`; if present, `UPDATE shops SET processing_status='failed', rejection_reason=reason WHERE id=shop_id AND processing_status NOT IN ('live','failed')`.
  - Insert a `job_logs` row via `log_job_event(db, job_id, 'warn', 'job.cancelled', reason=reason, admin_id=...)`.
  - Existing `log_admin_action` call stays.
  - **Guard update**: allow states `pending | claimed` (same as today; `claimed` = in-flight).

- **NEW endpoint** `GET /api/admin/pipeline/jobs/{job_id}/logs?after_ts={iso}` in `backend/api/admin.py`
  - Auth: `require_admin`
  - Returns `{ logs: [{id, level, message, context, created_at}], job_status }`
  - `after_ts` optional; enables incremental polling
  - Cap at 500 rows per request (defensive)

### Backend — workers (DEV-311 fix + DEV-308 logging)
- **MODIFY** `backend/workers/handlers/enrich_shop.py` (lines 87–111 write path)
  - At handler start: `await log_job_event(db, job_id, 'info', 'job.start', job_type='enrich_shop', shop_id=shop_id)`
  - Before LLM call: `await log_job_event(db, job_id, 'info', 'llm.call', provider=provider_name, model=model_name, method='enrich')`
  - **Before DB write**: `if not await check_job_still_claimed(db, job_id): await log_job_event(db, job_id, 'warn', 'job.aborted_midflight', ...); return` — checks for `cancelled` or any non-claimed terminal state
  - After DB write: `await log_job_event(db, job_id, 'info', 'db.write', columns=['description','enriched_at','tags'])`
  - At end: `await log_job_event(db, job_id, 'info', 'job.end', status='ok')`
  - On exception: `await log_job_event(db, job_id, 'error', 'job.error', error=str(e))` before re-raise
  - **Requires:** scheduler must pass `job_id` into handler (currently only `shop_id` + payload). See scheduler.py change.

- **MODIFY** `backend/workers/handlers/generate_embedding.py` (lines 92–99 write path) — same pattern as enrich_shop.

- **MODIFY** `backend/workers/handlers/summarize_reviews.py` (lines 73–92 write path) — same pattern.

- **MODIFY** `backend/workers/scheduler.py` (the `_dispatch_job` path)
  - Thread `job.id` as `job_id` into each handler invocation.
  - Keep existing `structlog` context (no removal; logs stay in stdout too).

- **MODIFY** `backend/workers/queue.py`
  - Accessor helper `async def get_status(job_id) -> JobStatus | None` (used by `check_job_still_claimed`). Single SELECT on `id`.

### Backend — tests
- **MODIFY** `backend/tests/workers/test_handlers.py` — add cases:
  - Handler aborts write when job_queue.status has been flipped to dead_letter mid-flight
  - Handler emits expected milestone log rows
- **MODIFY** `backend/tests/api/test_admin.py` — add cases for cancel_job with reason param, shop side-effect, and logs endpoint

### Frontend — UI
- **MODIFY** `app/(admin)/admin/jobs/_components/RawJobsList.tsx` (~line 122 cancel button)
  - Rename button label "Cancel" → "Force fail" (destructive variant already).
  - Confirm dialog: add a `reason` textarea (default empty → server uses "Cancelled by admin").
  - Include reason in POST body.
  - When a row is expanded AND status in (`pending`,`claimed`,`running`): mount a `JobLogsPanel` component and poll `GET /api/admin/pipeline/jobs/{id}/logs` every 3s. Stop polling on terminal status.

- **NEW** `app/(admin)/admin/jobs/_components/JobLogsPanel.tsx`
  - Props: `{ jobId, initialPollInterval }`
  - SWR-less custom `useEffect` + `setInterval(3000)` (matches existing pattern in `BatchesList.tsx`)
  - Passes `after_ts` (last seen timestamp) for incremental fetches
  - Renders: fixed-height scrollable panel, one row per log line, color-coded by level (info=gray, warn=amber, error=red), timestamp + message + context JSON collapsed by default
  - Stops polling when `job_status` in the response is terminal (`completed`,`failed`,`dead_letter`)

- **MODIFY** `app/(admin)/admin/_components/ConfirmDialog.tsx` — no change needed; already takes optional children for body content. New dialog in `RawJobsList` will pass a textarea via children.

- **MODIFY** Next.js proxy route (if exists) — confirm the `POST /api/admin/pipeline/jobs/{id}/cancel` proxy handler forwards the JSON body; add proxy for `GET .../logs` if not already pass-through.

### Frontend — tests
- **MODIFY** existing admin jobs test file(s) — vitest: JobLogsPanel polls while running, stops on terminal, renders log levels correctly. RawJobsList force-fail dialog sends reason.

---

## Testing Strategy

### Unit / Handler tests (pytest)
- `check_job_still_claimed` returns False for dead_letter/failed/completed
- `log_job_event` inserts one row with correct columns
- Each handler aborts its shop write when status is flipped mid-run (simulate by patching queue.get_status)
- Each handler emits expected milestone log lines on success
- cancel_job endpoint accepts reason, updates shop.processing_status when shop_id is in payload, inserts warn log

### Integration test
- `backend/tests/workers/test_handlers.py`: end-to-end scheduler → handler flow with DB mocked; verify no shop write happens after simulated cancellation

### Frontend tests (vitest)
- `JobLogsPanel.test.tsx`: polls every 3s, appends new rows, stops on terminal status
- `RawJobsList.test.tsx`: Force fail dialog includes reason textarea; POST body contains reason

### Testing classification (per CafeRoam convention)
- **(a) New e2e journey?** No — admin-only tooling, not a core user path. No change to `/e2e-smoke`.
- **(b) Coverage gate impact?** Touches `backend/api/admin.py`, `backend/workers/handlers/*`, `backend/workers/queue.py`. Handlers and queue are critical-path for enrichment pipeline — verify 80% coverage gate holds after change.

---

## Verification (end-to-end, staging)

1. **DB migration**: `supabase db diff` → `supabase db push` to staging. Verify `job_logs` table exists.
2. **Backend boot**: `cd backend && uv run uvicorn main:app --reload --port 8000`. Hit `/health`.
3. **Seed a test batch**: Queue a small enrichment batch (5–10 shops) via existing admin UI.
4. **DEV-308 check**: Open Jobs Queue → Raw Jobs tab → expand a running job. Confirm milestone log lines appear and update every 3s.
5. **DEV-307+311 check**:
   - Start a running batch.
   - Click Force fail on a `claimed` job mid-LLM-call. Enter reason "smoke test".
   - Confirm: (a) job row transitions to `dead_letter` with `last_error='smoke test'`; (b) after the worker finishes its in-flight call, its log shows `job.aborted_midflight` and **no shops row is overwritten**; (c) the related shop row has `processing_status='failed'` and `rejection_reason='smoke test'`.
6. **Regression**: Run existing cancel on a `pending` job (no operator reason). Confirm behavior unchanged — status → `dead_letter`, shop untouched (no shop_id lookup needed since job hasn't started).
7. **Tests**: `pnpm test` + `cd backend && uv run pytest`. Full suite green.
8. **Lint**: `pnpm lint`, `cd backend && ruff check . && mypy .`.

---

## Implementation Order (for executing-plans)

1. **[Foundation]** Migration `20260410000001_create_job_logs.sql`
2. **[Foundation]** `backend/workers/job_log.py` + `job_guard.py` + `queue.get_status()` helper + unit tests
3. **DEV-311** Handler guards — wire `check_job_still_claimed` into enrich_shop, generate_embedding, summarize_reviews + tests
4. **DEV-308 backend** Milestone `log_job_event` calls in all three handlers + scheduler threading `job_id` through
5. **DEV-307 backend** cancel_job endpoint: add reason param + shop side-effect + log row
6. **DEV-308 backend** `GET /api/admin/pipeline/jobs/{id}/logs` endpoint
7. **DEV-307 frontend** Force fail dialog with reason textarea in RawJobsList
8. **DEV-308 frontend** JobLogsPanel component + polling + integration into RawJobsList expanded row
9. Tests, lint, staging verification (steps 1–8 of Verification above)

---

## Linear Tasks To Append (one `## Tasks` checklist per ticket)

**DEV-307:**
- [ ] [Foundation] Migration: add `job_logs` table
- [ ] Backend: extend `cancel_job` with optional `reason` body param
- [ ] Backend: cancel_job updates `shops.processing_status='failed'` + `rejection_reason`
- [ ] Frontend: rename button "Cancel" → "Force fail"; add reason textarea to confirm dialog
- [ ] Tests: pytest for reason + shop side-effect; vitest for dialog

**DEV-311:**
- [ ] [Foundation] Backend helper `check_job_still_claimed(db, job_id)` in `workers/job_guard.py`
- [ ] Backend: `queue.get_status(job_id)` helper
- [ ] Wire pre-write guard into `enrich_shop.py` (before DB write)
- [ ] Wire pre-write guard into `generate_embedding.py`
- [ ] Wire pre-write guard into `summarize_reviews.py`
- [ ] Handler tests: mid-flight cancellation aborts shop write

**DEV-308:**
- [ ] [Foundation] `backend/workers/job_log.py` with `log_job_event` helper
- [ ] Scheduler threads `job_id` into all handler invocations
- [ ] Milestone log calls (job.start, llm.call, db.write, job.end, job.error) in all 3 handlers
- [ ] Backend: `GET /api/admin/pipeline/jobs/{id}/logs?after_ts=...` endpoint
- [ ] Frontend: `JobLogsPanel.tsx` component with 3s polling
- [ ] Frontend: integrate JobLogsPanel into RawJobsList expanded row
- [ ] Tests: polling stops on terminal; level rendering; scheduler job_id propagation

---

## Out of Scope (deliberate YAGNI)

- **Log retention / cleanup cron** — deferred until volume proves it's needed. Milestones-only keeps volume <20 rows/job.
- **SSE streaming** — polling is sufficient for admin-only UI.
- **Mid-LLM-call cancellation** (aborting an in-flight Anthropic request) — pre-write guard is enough; in-flight interruption would only save LLM cost, not correctness.
- **Structured reason codes** (enum: `operator_cancelled`, `retry_exhausted`, `bad_input`…) — tracked in a separate ticket. Free-text `cancel_reason` for now.
