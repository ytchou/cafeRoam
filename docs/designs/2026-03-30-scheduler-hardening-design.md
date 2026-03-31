# Design: Harden APScheduler Against Railway Dyno Restarts (DEV-74)

Date: 2026-03-30
Status: Approved
Ticket: [DEV-74](https://linear.app/ytchou/issue/DEV-74)

## Goal

Harden the embedded APScheduler against Railway dyno restarts to prevent silent job loss, duplicate cron execution, and stuck jobs. Preventive hardening before promoting to production (DEV-76).

## Context

CafeRoam runs APScheduler as an `AsyncIOScheduler` embedded in the FastAPI lifespan. The scheduler uses an in-process memory store (ephemeral), but job durability is provided by the Postgres `job_queue` table. The scheduler registry is deterministic — `create_scheduler()` re-registers all jobs on every cold start.

Railway can restart dynos at any time. Three edge-case risks exist:

1. **Stuck jobs** — A job claimed from Postgres gets stuck in `CLAIMED` status if SIGTERM doesn't reach the lifespan teardown (race condition)
2. **Cron double-fire** — No deduplication if a cron job runs, dyno restarts, and the cron fires again in the same window
3. **Silent registration failure** — No observability into whether all scheduler jobs registered successfully after a restart

## Approach: Defensive In-Process Hardening

Three mechanisms added to the existing scheduler, plus startup verification. No external dependencies, no new services.

### Alternatives Rejected

- **DB-level reaper (pg_cron)** — More resilient but requires pg_cron setup on Supabase. Overkill for single-dyno; the in-process reaper only needs to run when the process is alive (reclaiming leftovers from a previous crash).
- **Railway Cron (separate service)** — Cleanest separation but adds a second service ($cost), still needs stuck-job hardening for the poller, and moves schedule management to Railway infrastructure.

## Component 1: Stuck-Job Reaper

An APScheduler interval job (every 5 min) that finds jobs stuck in `CLAIMED` for >10 min.

**New RPC:** `reclaim_stuck_jobs(p_timeout_minutes INT DEFAULT 10)`

```sql
-- Jobs with remaining retries → reset to PENDING
UPDATE job_queue
SET status = 'pending', claimed_at = NULL, scheduled_at = now()
WHERE status = 'claimed'
  AND claimed_at < now() - interval '1 minute' * p_timeout_minutes
  AND attempts < max_attempts;

-- Jobs with exhausted retries → mark FAILED
UPDATE job_queue
SET status = 'failed'
WHERE status = 'claimed'
  AND claimed_at < now() - interval '1 minute' * p_timeout_minutes
  AND attempts >= max_attempts;
```

**Configuration:** `worker_stuck_job_timeout_minutes = 10` in `backend/core/config.py`. The longest-running handler is `scrape_batch` (Apify calls); if a job takes >10 min, it has likely been orphaned.

## Component 2: Cron Idempotency Locks

Prevent cron jobs from double-firing after a restart within the same execution window.

**New table:**

```sql
CREATE TABLE cron_locks (
  job_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (job_name, window_start)
);
```

**Mechanism:**

1. Before each cron handler fires, attempt `INSERT INTO cron_locks ... ON CONFLICT DO NOTHING`
2. If insert returns 0 rows → skip (already ran in this window)
3. Window granularity:
   - `weekly_email` → `date_trunc('week', now())`
   - `staleness_sweep`, `reembed_reviewed_shops`, `delete_expired_accounts` → `date_trunc('day', now())`
   - `reclaim_stuck_jobs` → no lock needed (idempotent by nature)
4. Reaper also deletes `cron_locks` rows older than 7 days

**Implementation:** `@idempotent_cron(window="day"|"week")` decorator wrapping cron handlers.

## Component 3: Startup Verification

**Startup logging:** After `scheduler.start()`, log each registered job with its next fire time. Structured log fields: `job_id`, `next_run`, `total_jobs`.

**Health endpoint:** `GET /health/scheduler`

```json
{
  "status": "ok",
  "registered_jobs": 6,
  "jobs": [{"id": "poll_pending_jobs", "next_run": "..."}, ...],
  "last_poll_at": "2026-03-30T12:00:05+08:00"
}
```

`last_poll_at` tracked via a module-level variable updated each poll cycle.

## Component 4: Staging Verification Protocol

1. Deploy to staging, hit `/health/scheduler` — confirm 6 jobs registered
2. Restart the staging `api` service via Railway dashboard
3. After restart, hit `/health/scheduler` — confirm same 6 jobs, reasonable `next_run` times
4. Check Railway logs for "Scheduler job registered" entries
5. Enqueue a test job, restart mid-processing, verify reclaim + completion after restart

## Error Handling

- **Reaper fails:** Logged + Sentry, retries next 5-min cycle. Non-critical.
- **Lock insert fails:** Logged + Sentry, cron proceeds anyway (double-fire > skip).
- **Health endpoint fails:** Returns 503. Does not affect scheduler.

## Data Flow: Stuck Job Recovery

```
Dyno crash (SIGTERM race)
  → job_queue row stuck: status=CLAIMED, claimed_at=T

New dyno starts
  → scheduler.start() registers all jobs including reclaim_stuck_jobs
  → Within 5 min, reclaim_stuck_jobs fires
  → Finds rows WHERE status='claimed' AND claimed_at < now() - 10min
  → Resets to PENDING with scheduled_at=now()
  → Next poll_pending_jobs picks it up → job completes
```

## Testing Strategy

<<<<<<< Updated upstream
| Test | Type | What it validates |
| -------------------------------- | ----------- | ------------------------------------------ |
| `test_reclaim_stuck_jobs` | Unit | Stuck rows get reset to PENDING |
| `test_reclaim_exhausted_retries` | Unit | Max-attempt jobs get FAILED, not reclaimed |
| `test_idempotent_cron_decorator` | Unit | Lock acquisition + skip on second call |
| `test_startup_logging` | Unit | All expected jobs logged on start |
| `test_health_scheduler_endpoint` | Integration | Response shape, job count, last_poll |
=======
| Test | Type | What it validates |
|------|------|-------------------|
| `test_reclaim_stuck_jobs` | Unit | Stuck rows get reset to PENDING |
| `test_reclaim_exhausted_retries` | Unit | Max-attempt jobs get FAILED, not reclaimed |
| `test_idempotent_cron_decorator` | Unit | Lock acquisition + skip on second call |
| `test_startup_logging` | Unit | All expected jobs logged on start |
| `test_health_scheduler_endpoint` | Integration | Response shape, job count, last_poll |

> > > > > > > Stashed changes

## Testing Classification

- [ ] **New e2e journey?** No — infrastructure only
- [ ] **Coverage gate impact?** No — not a critical-path service

## Files Changed

<<<<<<< Updated upstream
| File | Change |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `backend/workers/scheduler.py` | Reaper job, idempotent_cron decorator, startup logging, last_poll tracking |
| `backend/workers/queue.py` | `reclaim_stuck_jobs()` method |
| `backend/api/health.py` | `/health/scheduler` endpoint |
| `backend/core/config.py` | `worker_stuck_job_timeout_minutes` setting |
| `supabase/migrations/XXXXXX_cron_locks_and_reaper.sql` | `cron_locks` table + `reclaim_stuck_jobs` RPC |
| `backend/tests/workers/test_scheduler.py` | Hardening tests |
=======
| File | Change |
|------|--------|
| `backend/workers/scheduler.py` | Reaper job, idempotent_cron decorator, startup logging, last_poll tracking |
| `backend/workers/queue.py` | `reclaim_stuck_jobs()` method |
| `backend/api/health.py` | `/health/scheduler` endpoint |
| `backend/core/config.py` | `worker_stuck_job_timeout_minutes` setting |
| `supabase/migrations/XXXXXX_cron_locks_and_reaper.sql` | `cron_locks` table + `reclaim_stuck_jobs` RPC |
| `backend/tests/workers/test_scheduler.py` | Hardening tests |

> > > > > > > Stashed changes
