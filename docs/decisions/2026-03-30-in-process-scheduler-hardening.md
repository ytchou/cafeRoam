# ADR: In-Process Scheduler Hardening Over External Safety Nets

Date: 2026-03-30

## Decision

Harden APScheduler against Railway dyno restarts using in-process mechanisms (stuck-job reaper cron, idempotency lock table, startup verification) rather than external infrastructure (pg_cron or Railway Cron service).

## Context

Railway can restart dynos at any time. The embedded APScheduler uses an ephemeral in-process memory store, though job durability is provided by the Postgres job_queue table. Three risks needed addressing: stuck claimed jobs after SIGTERM races, cron double-fire after restart, and lack of startup verification. The question was where to place the hardening logic.

## Alternatives Considered

- **DB-level reaper (pg_cron)**: Run a Postgres cron job independently of the Python process to reclaim stuck jobs and enforce cron dedup. Rejected: requires pg_cron extension setup on Supabase staging/prod, adds migration complexity, and is overkill for a single-dyno topology. The reaper only needs to run when the process is alive (reclaiming leftovers from a previous crash).

- **Railway Cron (separate service)**: Move all scheduled work to a separate Railway service that hits API endpoints on a schedule. Rejected: adds a second service (cost + operational overhead), still needs stuck-job hardening for the poller, and moves schedule management to Railway infrastructure away from code.

## Rationale

The in-process approach is the simplest that addresses all three risks. The job queue is already durable (Postgres), so the scheduler registry's ephemerality is a non-issue — jobs re-register deterministically on every cold start. The stuck-job reaper runs as an APScheduler cron inside the same process, which is fine because it only needs to reclaim orphans from a previous crash (if the current process is alive, it can do the reclaiming). Cron idempotency is handled via a lightweight lock table. No new services, minimal migration.

If CafeRoam later scales to multiple dynos, this decision should be revisited — multi-dyno requires distributed locking (e.g., pg advisory locks or a dedicated scheduler service).

## Consequences

- Advantage: No new infrastructure, no pg_cron dependency, all hardening logic lives in application code alongside the scheduler
- Advantage: Configurable timeout via settings, easy to tune per environment
- Disadvantage: If the Python process never starts (crash loop), stuck jobs remain stuck until a successful boot. Acceptable for single-dyno pre-beta.
- Disadvantage: Single-dyno assumption — must revisit if scaling horizontally
