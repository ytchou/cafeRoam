# ADR: DB-as-Queue Pattern (Postgres job_queue over Redis/BullMQ)

Date: 2026-02-24

## Decision

Use a `job_queue` table in Postgres (Supabase) as the background job queue, claimed by workers via `FOR UPDATE SKIP LOCKED`. No external queue service.

## Context

CafeRoam requires a background job system for: shop enrichment (Claude), embedding generation (OpenAI), menu photo extraction, staleness sweeps, and weekly email. These jobs need to be durable (survive worker crashes), inspectable (debuggable), and support at-most-once delivery.

## Alternatives Considered

- **Redis + BullMQ**: Production-grade queue with concurrency, retries, priority, delayed jobs, and a dashboard UI. Rejected: adds Redis as a new infrastructure dependency, new billing account, more Railway service to manage. Overkill for a system processing dozens to hundreds of jobs per day.
- **Supabase Realtime subscription**: Worker subscribes to `job_queue` table inserts via WebSocket. Real-time push delivery. Rejected: WebSocket connection management (reconnect, heartbeat) adds worker complexity. Realtime-based worker would be harder to debug and test than polling.
- **Next.js API routes + Supabase Webhooks**: Webhooks POST to API routes, no separate worker process. Rejected: API routes have timeout limits and tie up web server threads. Conflicts with the Railway persistent worker decision (see ADR 2026-02-23-railway-over-vercel.md).

## Rationale

At CafeRoam's V1 scale (200-500 shops, dozens of jobs/day), a Postgres job queue is sufficient and avoids adding Redis as a dependency. Key advantages:

- **Zero new infrastructure**: `job_queue` is just another Supabase table. Same backup, same RLS, same tooling.
- **`FOR UPDATE SKIP LOCKED`**: Postgres advisory locking provides atomic job claiming — two workers cannot claim the same job. Enables horizontal scaling if needed.
- **SQL-inspectable**: Dead-lettered or failed jobs are directly queryable via SQL for debugging. No separate dashboard needed.
- **30s poll latency is acceptable**: Enrichment and email jobs are not time-critical. Menu photo enrichment can wait 30 seconds.

The scaling limit (~1,000 jobs/hour before contention) is well above V1 needs. If CafeRoam grows to a point where this bottlenecks, migrating to BullMQ is straightforward (same `job_type`/`payload` contract, swap the worker internals).

## Consequences

- Advantage: No Redis dependency — one fewer service to manage and pay for
- Advantage: Job history is queryable via SQL — easy debugging and audit
- Advantage: `FOR UPDATE SKIP LOCKED` enables multiple worker instances without coordination overhead
- Advantage: `SECURITY DEFINER` trigger inserts jobs directly on events (e.g., check-in with menu photo) without worker polling
- Disadvantage: 30s poll latency — not suitable for real-time jobs (not needed in V1)
- Disadvantage: At ~1,000 jobs/hour, Postgres polling creates table contention — needs migration to a real queue at scale
- Disadvantage: No built-in queue dashboard (BullMQ Board, etc.) — must query SQL directly
