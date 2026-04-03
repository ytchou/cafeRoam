# Cron Jobs Reference

Complete reference for all scheduled work in CafeRoam. Two layers: APScheduler (in-process,
Python backend) and pg_cron (Supabase DB-level).

---

## Architecture Overview

```
Railway (FastAPI service)
└── APScheduler (AsyncIOScheduler, timezone=Asia/Taipei)
    ├── Cron triggers  → enqueue jobs into `background_jobs` table
    ├── Interval polls → claim + dispatch jobs from the queue
    └── Idempotency   → `cron_locks` table (Supabase)

Supabase (Postgres)
└── pg_cron
    └── Runs SQL statements on a schedule, entirely inside the DB
```

Each environment (local, staging, prod) has its own independent scheduler. They do not
cross-connect. The APScheduler lives inside the Railway service process — if the service
restarts, the scheduler restarts with it. The pg_cron extension must be enabled separately
on each Supabase project.

---

## APScheduler Jobs

**Source:** `backend/workers/scheduler.py`

### Cron jobs (time-triggered)

| Job ID | Schedule | Handler | Purpose |
|---|---|---|---|
| `staleness_sweep` | Daily @ 03:00 Taipei | `handle_smart_staleness_sweep` | Scans all shops for stale data; enqueues `STALENESS_SWEEP` jobs for shops needing refresh |
| `reembed_reviewed_shops` | Daily @ 03:01 Taipei | `handle_reembed_reviewed_shops` | Re-generates pgvector embeddings for shops that were recently reviewed/enriched |
| `delete_expired_accounts` | Daily @ 03:02 Taipei | `delete_expired_accounts` | PDPA cascade: permanently deletes accounts that have been scheduled for deletion (photos, notes, lists, polaroids, profile) |
| `weekly_email` | Monday @ 09:00 Taipei | `handle_weekly_email` | Sends weekly digest email to subscribed users |

All four are wrapped with `@idempotent_cron` — see **Idempotency** section below.

### Interval jobs (continuous loops)

| Job ID | Interval | Purpose |
|---|---|---|
| `poll_pending_jobs` | Every 5 min (`settings.worker_poll_interval_seconds`, default 300s) | Main worker loop — one DB query to find pending job types, then dispatches each type up to its concurrency limit |
| `reclaim_stuck_jobs` | Every 30 min | Reclaims jobs stuck in `CLAIMED` status (handles worker crashes). Also runs cron lock cleanup once per day (7-day retention) |

Both use `max_instances=1` and `coalesce=True` — if a previous run is still in progress, the
next tick is skipped rather than overlapping.

---

## pg_cron Job

**Migration:** `supabase/migrations/20260327000004_register_search_cache_cron.sql`

| Job name | Schedule | SQL | Purpose |
|---|---|---|---|
| `cleanup-search-cache` | Hourly (`0 * * * *`) | `DELETE FROM search_cache WHERE expires_at < now()` | Purges expired rows from the semantic search result cache |

The migration is safe to apply even when pg_cron is not enabled — the `DO $$` block checks
for the extension first and silently skips if absent. This means local dev and staging instances
without pg_cron won't fail, but the job won't be registered either.

**Prerequisite:** pg_cron must be enabled in each Supabase project (DEV-55). See
[Verification](#verification) below.

---

## Idempotency

APScheduler cron jobs use a decorator + database lock to prevent double-firing (e.g., across
replicas, or after a crash-restart mid-window).

```
@idempotent_cron("staleness_sweep", window="day")
async def run_staleness_sweep() -> None: ...
```

**How it works:**

1. On each trigger, the decorator calls `queue.acquire_cron_lock(job_name, window)`.
2. `acquire_cron_lock` computes `window_start` (start of today for `"day"`, start of Monday for
   `"week"`).
3. It attempts an upsert into the `cron_locks` table on `(job_name, window_start)` with
   `ignore_duplicates=True`.
4. If a row already exists → upsert is a no-op → `response.data` is empty → returns `False`
   → job is skipped.
5. If first run in window → row is inserted → returns `True` → job proceeds.
6. Lock failure (DB down) fails open: logs a warning to Sentry and returns `True`, allowing the
   job to run rather than silently skip.

**Cleanup:** `reclaim_stuck_jobs` calls `cleanup_old_cron_locks(retention_days=7)` once per day,
deleting `cron_locks` rows older than 7 days.

**Table:** `cron_locks (job_name TEXT, window_start TIMESTAMPTZ, created_at TIMESTAMPTZ)`
with a unique constraint on `(job_name, window_start)`.

---

## Job Queue Flow

Cron jobs themselves are lightweight: they just enqueue a job type into `background_jobs`.
The actual work happens asynchronously via `poll_pending_jobs`:

```
cron trigger fires
  → acquire_cron_lock (idempotency check)
  → queue.enqueue(job_type=..., payload={})   ← writes to background_jobs table
  
poll_pending_jobs fires every N seconds
  → queue.get_pending_job_types()             ← one SELECT DISTINCT
  → process_job_type(jt) for each type
    → queue.claim_batch(jt, limit=available)  ← UPDATE ... RETURNING
    → asyncio.create_task(_run_job(job))      ← dispatches handler
    → queue.complete(job.id) or queue.fail()
```

Concurrency limits per job type are configured via env vars
(`WORKER_CONCURRENCY_ENRICH`, `WORKER_CONCURRENCY_EMBED`, etc.).

---

## Staging vs Production

APScheduler and pg_cron are fully isolated per environment. No shared state.

| | Staging | Production |
|---|---|---|
| Scheduler host | Railway staging service | Railway prod service |
| Supabase project | `caferoam-staging` | `caferoam-prod` (to be created, DEV-76) |
| cron_locks table | staging DB | prod DB |
| pg_cron registered | only if extension enabled in staging Supabase | only if extension enabled in prod Supabase |
| background_jobs | staging DB | prod DB |

When you deploy to staging, the APScheduler starts fresh. The first cron trigger after deploy
will acquire locks for the current window and enqueue work. Previous locks from a prior deploy
are still in the DB — they prevent re-running for the same calendar day/week.

---

## Admin Dashboard Operations

### Check scheduler health

```
GET /health/scheduler
Authorization: Bearer <admin-jwt>
```

Returns:
```json
{
  "status": "ok",
  "registered_jobs": 6,
  "jobs": [
    { "id": "staleness_sweep", "next_run": "2026-04-04T19:00:00+08:00" },
    { "id": "weekly_email", "next_run": "2026-04-07T01:00:00+08:00" },
    ...
  ],
  "last_poll_at": "2026-04-03T10:42:01.234567+00:00"
}
```

- `registered_jobs: 6` confirms all 6 jobs are scheduled.
- `last_poll_at` confirms the worker loop is alive. If `null`, the first poll hasn't fired yet.
- This endpoint is **admin-only** (requires admin JWT). It is not Railway's liveness probe — that hits `/health`.

### Inspect the job queue

Navigate to `/admin/jobs` in the admin dashboard.

- **Batch Runs tab** — groups jobs by batch (enrichment pipeline runs); shows success/fail counts
- **Raw Jobs tab** — individual job records; filterable by status (`pending`, `claimed`, `done`,
  `failed`). Can cancel or retry individual jobs.

Cron-triggered jobs appear here after the cron fires and `queue.enqueue()` writes to
`background_jobs`. You can watch new rows appear in **Raw Jobs** after a cron window triggers.

### Inspect cron locks

In Supabase SQL Editor (local or staging):

```sql
-- See all active cron locks
SELECT job_name, window_start, created_at FROM cron_locks ORDER BY created_at DESC;

-- Force re-run a cron job in the same window (use sparingly)
DELETE FROM cron_locks WHERE job_name = 'staleness_sweep';
```

Deleting a lock lets the next trigger re-acquire it and re-run the job within the same
calendar window. Use this to manually re-trigger a job without waiting for the next day.

---

## Verification

### APScheduler (staging)

1. **Hit `/health/scheduler`** with admin auth:
   - `registered_jobs` must be `6`
   - All 6 job IDs must be present
   - `last_poll_at` must not be `null` (wait ~30s after deploy)

2. **Check Railway logs** for idempotent lock acquisition:
   ```
   Cron already ran in this window, skipping  job_name=staleness_sweep
   # or on first run:
   # no skip log → job enqueued → appears in /admin/jobs
   ```

### pg_cron (staging + prod)

1. Enable the extension: **Supabase Dashboard → Database → Extensions → pg_cron → Enable**
2. Verify registration in SQL Editor:
   ```sql
   SELECT jobname, schedule, command, active FROM cron.job;
   ```
   Expected row: `cleanup-search-cache | 0 * * * * | DELETE FROM search_cache WHERE expires_at < now() | true`
3. If the row is missing (migration ran before extension was enabled), register manually:
   ```sql
   SELECT cron.schedule(
     'cleanup-search-cache',
     '0 * * * *',
     'DELETE FROM search_cache WHERE expires_at < now()'
   );
   ```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/health/scheduler` returns `registered_jobs: 0` | Scheduler failed to start | Check Railway logs for startup errors |
| `last_poll_at` is `null` after 1 min | Worker poll loop not firing | Verify `WORKER_POLL_INTERVAL_SECONDS` is set; check logs for DB connection errors |
| Cron job not firing | Lock from prior deploy still blocking | Delete the lock row: `DELETE FROM cron_locks WHERE job_name = '...'` |
| Jobs stuck in `CLAIMED` | Worker crashed mid-job | `reclaim_stuck_jobs` will auto-reclaim after `WORKER_STUCK_JOB_TIMEOUT_MINUTES`; or retry from `/admin/jobs` |
| `cleanup-search-cache` not in `cron.job` | pg_cron was not enabled when migration ran | Enable extension, then run `SELECT cron.schedule(...)` manually |
| pg_cron job not running | Extension disabled or job not registered | See verification steps above |
