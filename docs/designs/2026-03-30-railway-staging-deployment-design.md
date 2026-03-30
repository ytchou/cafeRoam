# Design: Railway Staging Deployment (DEV-73)

Date: 2026-03-30
Status: Approved
Parent ticket: DEV-73

## Goal

Get both Railway services (Next.js frontend + FastAPI backend) live on staging with all 32 environment variables wired, using the existing `railway.json` config. First real deployment of the app — validates Railway-specific behaviour before prod (ASSUMPTIONS.md T5).

## Architecture

Two Railway services in a single project (`caferoam-staging`), auto-deployed from `main`:

```
GitHub (main) --> Railway auto-deploy
                  |-- web (NIXPACKS) --> Next.js :3000 --> public URL
                  |-- api (Dockerfile) --> FastAPI :8000 --> internal only
                      <-> Railway private network
```

- **web** talks to **api** via Railway internal networking (`http://api.railway.internal:8000`)
- **api** is not publicly exposed — only the web service has a public URL
- Both services share the same Railway project and deploy atomically on push to `main`

## Dependencies

- **DEV-71** (completed): Supabase staging bootstrapped in Tokyo (ap-northeast-1)
- **DEV-72** (completed): Migration parity validated (schema, RLS, triggers, pgvector)

## Decisions

| Decision          | Choice                                       | Rationale                                                                                                                                                                         |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observability     | Shared projects + `environment=staging` tags | $0 cost — Sentry (unlimited free projects, env filter built-in), PostHog (native Environments feature, free tier = 1 project), Better Stack (naming convention, 10 free monitors) |
| Staging URL       | Railway auto-generated                       | Free, sufficient for dev/QA. Custom subdomain deferred.                                                                                                                           |
| Deploy trigger    | Auto-deploy from `main`                      | Fast feedback loop, standard staging workflow                                                                                                                                     |
| Paid API services | Real keys, low traffic                       | Validates real integrations; staging traffic negligible                                                                                                                           |
| Env vars          | Set all 32 from scratch                      | No assumptions about prior DEV-71 partial setup                                                                                                                                   |

### Alternatives rejected

- **Separate observability projects**: PostHog free tier is 1 project — would require Pay-as-you-go upgrade. Sentry is free for multiple projects but adds management overhead for no benefit at this scale. Native environment separation is sufficient.
- **Manual deploys**: Adds friction to deploy-test cycle. Auto-deploy from main is standard and can be paused if needed.
- **Mock providers on staging**: Defeats the purpose of staging — can't validate real integration paths.

## Components

### 1. Railway Project Setup (DEV-95)

- Create project `caferoam-staging` via Railway CLI
- Add two services: `web` (NIXPACKS) + `api` (Dockerfile) per `railway.json`
- Link GitHub repo, set auto-deploy branch to `main`

### 2. Environment Variables (DEV-96)

32 variables across two services. Full mapping:

| Category        | Variable                            | Service | Staging value                        |
| --------------- | ----------------------------------- | ------- | ------------------------------------ |
| Supabase        | `NEXT_PUBLIC_SUPABASE_URL`          | web     | Staging Supabase URL (Tokyo)         |
| Supabase        | `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | web     | Staging anon key                     |
| Supabase        | `SUPABASE_SERVICE_ROLE_KEY`         | api     | Staging service role key             |
| LLM             | `LLM_PROVIDER`                      | api     | `anthropic`                          |
| LLM             | `ANTHROPIC_API_KEY`                 | api     | Real key (1Password)                 |
| Embeddings      | `EMBEDDINGS_PROVIDER`               | api     | `openai`                             |
| Embeddings      | `OPENAI_API_KEY`                    | api     | Real key (1Password)                 |
| Email           | `EMAIL_PROVIDER`                    | api     | `resend`                             |
| Email           | `RESEND_API_KEY`                    | api     | Real key (1Password)                 |
| Email           | `EMAIL_FROM`                        | api     | `noreply@caferoam.tw`                |
| Maps            | `MAPS_PROVIDER`                     | web     | `mapbox`                             |
| Maps            | `NEXT_PUBLIC_MAPBOX_TOKEN`          | web     | Real token (1Password)               |
| Analytics       | `ANALYTICS_PROVIDER`                | web     | `posthog`                            |
| Analytics       | `NEXT_PUBLIC_POSTHOG_KEY`           | web     | Same as prod (shared project)        |
| Analytics       | `NEXT_PUBLIC_POSTHOG_HOST`          | web     | Same as prod                         |
| Analytics       | `POSTHOG_API_KEY`                   | api     | Same as prod                         |
| Analytics       | `POSTHOG_PROJECT_ID`                | api     | Same as prod                         |
| Analytics       | `NEXT_PUBLIC_GA_MEASUREMENT_ID`     | web     | Same as prod (or empty)              |
| Error tracking  | `NEXT_PUBLIC_SENTRY_DSN`            | web     | Same DSN (shared project)            |
| Error tracking  | `SENTRY_DSN`                        | api     | Same DSN (shared project)            |
| Error tracking  | `SENTRY_AUTH_TOKEN`                 | web     | Same token                           |
| Error tracking  | `SENTRY_ORG`                        | web     | Same org                             |
| Error tracking  | `SENTRY_PROJECT`                    | web     | Same project                         |
| Error tracking  | `SENTRY_ENVIRONMENT`                | both    | `staging`                            |
| Scraping        | `APIFY_API_TOKEN`                   | api     | Real token (1Password)               |
| Backend routing | `BACKEND_INTERNAL_URL`              | web     | `http://api.railway.internal:8000`   |
| App config      | `NEXT_PUBLIC_APP_URL`               | web     | Railway auto-generated URL           |
| App config      | `NODE_ENV`                          | both    | `production`                         |
| Search cache    | `SEARCH_CACHE_PROVIDER`             | api     | `supabase`                           |
| Search cache    | `SEARCH_CACHE_TTL_SECONDS`          | api     | `14400`                              |
| Search cache    | `SEARCH_CACHE_SIMILARITY_THRESHOLD` | api     | `0.85`                               |
| E2E fixture     | `E2E_CLAIMED_SHOP_ID`               | web     | A real shop ID from 164 seeded shops |

### 3. Sentry Environment Tagging (DEV-97)

Verify both frontend and backend Sentry SDK init reads `SENTRY_ENVIRONMENT`:

- Frontend: `sentry.client.config.ts` / `sentry.server.config.ts`
- Backend: Sentry init in FastAPI app

### 4. Observability Setup (DEV-99)

- **Better Stack**: 2 monitors — `[staging] web` and `[staging] api`, 3-min interval
- **PostHog**: Native Environments feature — create "staging" environment in dashboard
- **Sentry**: No dashboard config needed — env tag auto-creates the filter

## Data Flow

```
User --> Railway public URL (web)
          --> Next.js SSR/API routes
          --> BACKEND_INTERNAL_URL (private network)
          --> FastAPI (api service)
          --> Supabase Staging (Tokyo)
          --> External APIs (Claude, OpenAI, Mapbox, etc.)
```

## Error Handling

- Railway auto-restarts crashed services (built-in)
- Health check failures trigger Railway restart (`/` for web, `/health` for api)
- Sentry captures errors with `environment=staging` tag
- If a deploy fails health checks, Railway rolls back to previous deploy automatically

## Verification (DEV-98)

1. Both health endpoints respond 200 (`/` and `/health`)
2. Frontend loads and renders shop directory (164 shops)
3. Frontend-to-backend proxy works (semantic search returns results)
4. Auth flow works against staging Supabase (login with test user)
5. Sentry test error appears in dashboard tagged `staging`
6. PostHog pageview appears in staging environment

## Testing Classification

- [x] **New e2e journey?** No — no new critical user path introduced. This is infra.
- [x] **Coverage gate impact?** No — no critical-path service code touched.

## Sub-issues

| Order | Ticket | Title                                                             | Size | Blocked by             |
| ----- | ------ | ----------------------------------------------------------------- | ---- | ---------------------- |
| 1     | DEV-95 | Create Railway project + link GitHub repo + configure services    | S    | --                     |
| 2     | DEV-96 | Wire all 32 env vars to Railway staging services                  | M    | DEV-95                 |
| 3     | DEV-97 | Ensure Sentry SDK reads SENTRY_ENVIRONMENT for staging tagging    | S    | --                     |
| 4     | DEV-98 | Trigger first deploy + verify health checks (web + api)           | M    | DEV-95, DEV-96, DEV-97 |
| 5     | DEV-99 | Set up Better Stack staging monitors + verify PostHog environment | S    | DEV-98                 |
