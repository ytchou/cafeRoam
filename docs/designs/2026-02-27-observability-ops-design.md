# Observability & Ops Design

Date: 2026-02-27

## Overview

CafeRoam's observability stack uses a **best-of-breed** approach: each tool is chosen for what it does best, running on free tiers at launch. The priority order for instrumentation is: silent failures > performance degradation > security incidents > data quality.

**Stack:**

| Layer | Tool | Free Tier Headroom |
|-------|------|--------------------|
| Error tracking | Sentry | 5K errors/mo, 5M spans, 30-day retention |
| Product analytics | PostHog | 1M events/mo, 5K recordings, 1-year retention |
| Uptime monitoring | Better Stack | 10 monitors, 30-sec checks, Slack/Discord alerts |
| Application logs | Railway + structlog | Included with hosting |
| Alerts | Sentry (email) + Better Stack (Slack/Discord) | Free on both |

**Cost: $0/mo at launch.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CafeRoam Services                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Next.js FE  │  │  FastAPI BE  │  │   Workers    │  │
│  │  (Railway)   │  │  (Railway)   │  │  (Railway)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │  Sentry   │     │  Sentry   │     │ structlog  │
    │ @sentry/  │     │ sentry-sdk│     │  (Railway  │
    │ nextjs    │     │ [fastapi] │     │   logs)    │
    └───────────┘     └───────────┘     └───────────┘
          │                  │
    ┌─────▼─────┐     ┌─────▼─────┐
    │ PostHog   │     │ PostHog   │
    │ posthog-js│     │ (backend  │
    │ (events)  │     │  adapter) │
    └───────────┘     └───────────┘

    ┌───────────────────────────────────┐
    │         Better Stack              │
    │  Uptime: /health (API) + / (FE)  │
    │  Alerts: Email + Slack/Discord    │
    └───────────────────────────────────┘
```

## Components

### 1. Sentry — Error Tracking

**Frontend (Next.js):**
- Install `@sentry/nextjs` — wraps both client and server automatically
- Initialize via `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts`
- Next.js `instrumentation.ts` hook for server-side init (App Router pattern)
- Source maps uploaded at build time via `withSentryConfig` in `next.config.ts`
- Capture: unhandled errors, React error boundaries, navigation breadcrumbs
- Release tracking: tag each deploy with git SHA

**Backend (FastAPI):**
- Already installed (`sentry-sdk[fastapi]`), just needs initialization
- Initialize in `backend/main.py` lifespan with `sentry_sdk.init()`
- `SentryAsgiMiddleware` auto-captures FastAPI request context (URL, method, status)
- Enrich errors with: request ID, user ID (anonymized), environment tag
- Worker errors: initialize Sentry in scheduler process too — captures job failures with job type + shop ID context

**Instrumentation scope:**
- All unhandled exceptions (automatic)
- Enrichment pipeline failures (manual `capture_exception` with context)
- Search service errors (embedding API failures, pgvector timeouts)
- Auth failures above threshold (possible brute force indicator)

**Excluded from Sentry:**
- Expected 4xx errors (validation, not-found)
- Rate-limited requests (log only)

**Free tier note:** 5K errors/mo is sufficient pre-launch. No Slack integration on free tier — error alerts go to email. Uptime alerts (Better Stack) cover Slack/Discord for critical outages.

### 2. PostHog — Product Analytics

**Frontend SDK (`posthog-js`):**
- Initialize via a `PostHogProvider` React context in the app layout
- Respect `Do Not Track` browser setting
- Never send PII — use anonymous PostHog distinct IDs, no email/name in events

**Events tracked (mapped to PRD success metrics):**

| Event | Properties | Maps to |
|-------|-----------|---------|
| `search_performed` | query (hashed), mode, result_count | Search wow rate |
| `shop_viewed` | shop_id, source (search/map/list) | Discovery funnel |
| `checkin_created` | shop_id, has_menu_photo | Check-in rate |
| `list_created` | list_count | Engagement |
| `list_shared` | share_target | Viral coefficient |
| `auth_signup` | method (google/email) | Acquisition |
| `page_view` | path, referrer | WAU, retention |

**Session recordings:** Enabled (5K/mo free). Useful for UX debugging.

**Backend analytics (existing adapter):**
- `PostHogAnalyticsAdapter` in `backend/providers/analytics/` already exists
- Wire into API routes for server-side events: `enrichment_completed`, `embedding_generated`, `worker_job_failed`

### 3. Better Stack — Uptime Monitoring

Replaces UptimeRobot (free tier now restricted to non-commercial use since Nov 2024).

**Monitors (3 of 10 free):**

| Monitor | URL | Interval | Purpose |
|---------|-----|----------|---------|
| API Health | `api.caferoam.com/health` | 60s | Backend availability |
| Web Health | `caferoam.com` | 60s | Frontend availability |
| API Deep Health | `api.caferoam.com/health/deep` | 300s | DB + Supabase connectivity |

**Alerting:** Slack/Discord webhook (primary) + email (backup). Alert after 2 consecutive failures.

**Status page:** 1 free public status page at `status.caferoam.com`.

### 4. Health Checks

**Shallow (`GET /health`):**
- Returns 200 if FastAPI process is alive
- Used by Railway for container health checks
- No external dependencies checked (fast, no false positives)

**Deep (`GET /health/deep`):**
- Checks: Postgres connectivity (simple query), Supabase Auth reachability
- Returns structured JSON:
  ```json
  {
    "status": "healthy",
    "checks": {
      "postgres": {"status": "healthy", "latency_ms": 12},
      "supabase_auth": {"status": "healthy", "latency_ms": 45}
    }
  }
  ```
- Returns 503 if any dependency is unhealthy
- Used by Better Stack deep monitor (5-min interval)
- Timeout: 5s per dependency check — mark degraded rather than hammering

### 5. Structured Logging & Request Tracing

**Request logging middleware:**
- Log every API request: method, path, status code, duration_ms, request_id
- Attach UUID `request_id` via middleware
- Return in response headers (`X-Request-ID`) for bug report correlation
- Skip: health check endpoints, static assets

**Worker logging:**
- Already structured (job_id, job_type, shop_id)
- Add duration_ms to completion logs
- Add retry count to failure logs

**Log levels:**
- `INFO`: Request completed, job completed, enrichment completed
- `WARNING`: Slow queries (>2s), retry attempts, rate limit approaching
- `ERROR`: Unhandled exceptions, external API failures, job failures

**Log destination:** Railway built-in log viewer. No external aggregation at launch. Upgrade path: Axiom or Better Stack Logtail when needed.

### 6. Alerting Strategy

Low noise, high signal for solo ops.

| Alert | Source | Channel | Trigger |
|-------|--------|---------|---------|
| New error type | Sentry | Email | First occurrence of unseen error |
| Error spike | Sentry | Email | >10 errors in 5 minutes |
| API down | Better Stack | Slack/Discord + Email | 2 consecutive failures |
| Web down | Better Stack | Slack/Discord + Email | 2 consecutive failures |
| Deep health fail | Better Stack | Slack/Discord | DB or Supabase unreachable |
| Worker crash | Railway | Dashboard | Process exits unexpectedly |

**Not alerted:**
- Individual 4xx errors (expected)
- Slow requests (logged, tracked in PostHog)
- Enrichment retries (expected, self-healing)

## Data Flow

1. **Error occurs** → Sentry SDK captures with stack trace + breadcrumbs → Sentry dashboard + email alert
2. **User action** → PostHog JS captures event → PostHog dashboard (funnels, retention)
3. **API request** → structlog middleware logs request/response → Railway log viewer
4. **Service down** → Better Stack detects failed health check → Slack/Discord + email
5. **Worker job fails** → structlog + Sentry capture → Railway logs + Sentry dashboard

## Error Handling

- **Sentry SDK errors** (e.g., network failure to Sentry): Silently dropped. Never block user requests for telemetry failures.
- **PostHog SDK errors**: Silently dropped. Analytics must never impact UX.
- **Health check dependency timeout**: Return degraded status, don't hang the endpoint.
- **Better Stack webhook failure**: Better Stack handles retry internally. Email backup ensures delivery.

## Testing Strategy

**Unit tests:**
- Health check endpoints (shallow + deep, including dependency failure mocks)
- Sentry initialization (DSN set, environment tags correct)
- Request ID middleware (UUID generation, header attachment)
- PostHog event shaping (no PII leakage)

**Integration tests:**
- Deep health with mocked unhealthy DB → returns 503
- PostHog event tracking verification

**Manual verification checklist:**
- [ ] Trigger test error → appears in Sentry dashboard
- [ ] Create test event → appears in PostHog
- [ ] Kill API container → Better Stack alert fires within 2 minutes
- [ ] Check `X-Request-ID` header in API responses

## Upgrade Path

When CafeRoam outgrows free tiers:

| Bottleneck | Upgrade | Cost |
|-----------|---------|------|
| Sentry single-user / need Slack | Sentry Team | $26/mo |
| Log retention beyond Railway | Axiom or Better Stack Logtail | $25/mo |
| Need APM-level tracing | Sentry Performance or Grafana Cloud | $19-26/mo |
| Metrics dashboards | Grafana Cloud | $19/mo |
