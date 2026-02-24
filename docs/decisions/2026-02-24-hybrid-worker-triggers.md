# ADR: Hybrid Worker Triggers (Cron + DB Triggers over Cron-Only or Realtime)

Date: 2026-02-24

## Decision

Background workers use a hybrid trigger model: `node-cron` for scheduled batch jobs + Postgres `AFTER INSERT` triggers for real-time event-driven jobs. Workers poll the `job_queue` table on a 30-second interval.

## Context

CafeRoam needs two categories of background work:
1. **Scheduled batch work**: staleness sweep (daily), weekly curated email (Monday)
2. **Event-driven work**: when a user uploads a menu photo during check-in, enrichment should run soon after

These two categories have different latency requirements and trigger semantics.

## Alternatives Considered

- **Cron-only**: All jobs triggered on a schedule. Event-driven jobs (menu photo enrichment) would be picked up on the next staleness sweep or a short-interval cron. Rejected: menu photo enrichment would have up to 24-hour latency. More importantly, it conflates periodic maintenance with user-triggered actions.
- **Queue-based (BullMQ/Redis)**: Jobs pushed to Redis on events, workers consume immediately. Rejected: adds Redis dependency. See ADR 2026-02-24-db-as-queue-pattern.md.
- **Supabase Realtime + cron**: Worker subscribes to `job_queue` table changes via WebSocket for real-time delivery + `node-cron` for scheduling. Rejected: WebSocket connection management (reconnect, heartbeat, backpressure) adds worker complexity with minimal benefit over polling at V1 scale.
- **Next.js API routes + webhooks**: Supabase Database Webhooks POST to Next.js API routes. Rejected: ties up web server threads, timeout limits, no persistent state for retry tracking.

## Rationale

The hybrid model separates concerns cleanly:

- **DB triggers** handle the "something happened, react to it" case. The `trg_checkin_menu_photo` trigger fires `AFTER INSERT ON check_ins` and inserts a `job_queue` row when `menu_photo_url IS NOT NULL`. This is atomic with the check-in insert — no race conditions, no missed events, no extra API call from the app.
- **`node-cron`** handles the "run this on a schedule" case. The scheduler inserts job rows at defined intervals. Workers pick them up on the next poll.
- **30s poll loop** is the single consumer for both trigger types. Simple, testable, debuggable.

The DB trigger approach means the app code (check-in API route) does not need to know about the enrichment worker. It just inserts a check-in; the trigger handles queuing. This keeps the app layer thin and the worker concerns isolated.

## Consequences

- Advantage: DB trigger is atomic with the originating event — no missed menu photo enrichment jobs
- Advantage: App code is decoupled from worker scheduling — check-in API route is unaware of enrichment
- Advantage: `node-cron` with `timezone: 'Asia/Taipei'` ensures schedules are correct for Taiwan users without timezone math in application code
- Advantage: Single poll loop consumes both cron-inserted and trigger-inserted jobs uniformly
- Disadvantage: 30s latency for all job processing (cron-inserted and trigger-inserted jobs alike)
- Disadvantage: DB triggers are harder to test than application code — trigger behavior is validated by integration test (insert check-in with menu photo, verify job row created)
- Disadvantage: Adding new event-driven triggers requires a new migration (SQL) rather than a code change
