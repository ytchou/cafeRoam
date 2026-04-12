# Design: Structured Reason Codes for job_queue (DEV-312)

Date: 2026-04-12

## Context

DEV-307 added `cancel_reason TEXT` + `cancelled` status to `job_queue` for operator force-fails. The column is freeform text, making it impossible to filter or report on failure categories programmatically. This ticket upgrades it with a structured `reason_code` column covering all terminal statuses.

Also completes unfinished DEV-307 wiring: the backend Job Pydantic model and frontend Job interface never added `cancel_reason`, `cancelled_at`, `failed_at`.

## Architecture

### New Column

`reason_code TEXT` with CHECK constraint on `job_queue`. TEXT + CHECK chosen over Postgres ENUM — matches existing JobStatus constraint pattern and is easy to evolve (ALTER TABLE vs ALTER TYPE gymnastics).

### Reason Codes (6 values)

| Code | Terminal Status | Written By |
|------|----------------|-----------|
| `operator_cancelled` | cancelled | admin cancel endpoint (`admin.py`) |
| `retry_exhausted` | dead_letter | `queue.fail()` when `attempts >= max_attempts` |
| `bad_input` | failed | scheduler (payload validation) |
| `timeout` | pending/dead_letter | `reclaim_stuck_jobs` RPC |
| `dependency_failed` | failed | scheduler (upstream step failed) |
| `provider_error` | failed | scheduler (LLM/embedding exception) |

### Scope

`reason_code` applies to ALL terminal statuses (failed, dead_letter, cancelled), not just operator cancellations. This provides full observability across all failure modes.

### API Changes

**`queue.fail()` signature:** `fail(job_id, error, reason_code: JobReasonCode)` — reason_code is **required**. Forces every call site to explicitly choose a code.

**`cancel_job` endpoint:** Automatically writes `reason_code='operator_cancelled'` alongside existing `cancel_reason` text.

**`list_jobs` endpoint:** Accepts optional `reason_code` query parameter for filtering.

**`reclaim_stuck_jobs` RPC:** Writes `reason_code='timeout'` (reclaimed to pending) or `reason_code='retry_exhausted'` (moved to dead_letter).

### Frontend

- `Job` interface updated with `reason_code`, `cancel_reason`, `cancelled_at`, `failed_at`
- `ReasonCodeBadge` component following `status-badge.ts` pattern (color-coded by severity)
- Badge displayed in table row and expanded detail
- Filter dropdown alongside existing status/type filters

### Data Model

```
job_queue
├── reason_code TEXT CHECK (IN ('operator_cancelled', 'retry_exhausted', 'bad_input', 'timeout', 'dependency_failed', 'provider_error'))
├── cancel_reason TEXT (unchanged — free-text operator notes)
├── cancelled_at TIMESTAMPTZ (unchanged)
└── failed_at TIMESTAMPTZ (unchanged)
```

### Backfill

Best-effort migration backfill:
- `status = 'cancelled'` → `reason_code = 'operator_cancelled'`
- `status = 'dead_letter'` → `reason_code = 'retry_exhausted'`

## Decisions

- **TEXT + CHECK over Postgres ENUM** — easy to add/remove codes via ALTER TABLE
- **All terminal statuses** — not just cancelled; full observability on automated failures
- **Required reason_code** — prevents NULL values slipping through; catches gaps at type level
- **cancel_reason stays** — reason_code is structured; cancel_reason is free-text operator notes

## Alternatives Rejected

- **Postgres ENUM type** — adding values requires ALTER TYPE, removing is impossible without recreation
- **Cancelled-only scope** — loses observability on retry_exhausted, timeout, provider_error
- **Optional reason_code** — allows NULLs, defeating the purpose of structured categorization

## Testing Classification

- [x] No new e2e journey — admin-only internal tooling
- [x] No critical-path service touched — job queue is infra, not checkin/search/lists
- [x] No E2E drift risk — no route changes, no visible text users see
