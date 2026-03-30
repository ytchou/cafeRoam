# Production Promotion Runbook

Step-by-step checklist for promoting CafeRoam from staging to production.
Check off each item as you complete it. Do not proceed to the next phase if any item fails.

**Ticket:** DEV-76
**Milestone:** Beta Launch
**Gate:** Staging must be stable for ≥2 days (no crashes in Sentry, Better Stack green) before starting.

---

## Phase 0: Prerequisites

- [ ] Staging has been stable for ≥2 consecutive days (check Sentry → no new issues, Better Stack → all green)
- [ ] DEV-74 (APScheduler hardening) is merged and deployed to staging ✓
- [ ] DEV-75 (Mapbox perf validation) is merged and deployed to staging ✓
- [ ] Railway CLI installed and logged in: `railway whoami`
- [ ] Supabase CLI installed and logged in: `supabase projects list`
- [ ] You have access to DNS for `caferoam.tw`

---

## Phase 1: Supabase Production Project

- [ ] Create a new Supabase project named **caferoam-prod** at [app.supabase.com](https://app.supabase.com)
  - Region: **ap-northeast-1 (Tokyo)** — lowest latency from Taiwan
  - Use a strong database password; save it in your password manager
- [ ] Record the three credentials from **Project Settings → API**:
  - `NEXT_PUBLIC_SUPABASE_URL` (e.g. `https://xxxx.supabase.co`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` — treat as a secret, never expose to browser
- [ ] Configure Auth URL settings (see `docs/ops/supabase-prod-config.md`):
  - Site URL → `https://caferoam.tw`
  - Redirect URL → `https://caferoam.tw/auth/callback`
- [ ] Enable the **Custom Access Token hook** (Authentication → Hooks):
  - URI: `pg-functions://postgres/public/custom_access_token_hook`
- [ ] Configure custom SMTP via Resend (Authentication → Email Templates → SMTP Settings)
- [ ] Apply all migrations to prod:
  ```bash
  supabase link --project-ref <prod-project-ref>
  supabase db diff --linked   # verify — should show no diff after push
  supabase db push
  ```
- [ ] Run parity check — confirm migration history matches staging:
  ```bash
  supabase db diff --linked   # must be empty after push
  ```
- [ ] Verify RLS is enabled on all user-facing tables:
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;
  -- expected: empty result (or only non-user-facing tables)
  ```

---

## Phase 2: Railway Production Environment

- [ ] In Railway dashboard, open the caferoam project → **New Environment** → name it `production`
  - Clone env vars from staging as a starting point
- [ ] Swap in prod Supabase credentials (from Phase 1):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set environment flags:
  - `NODE_ENV=production`
  - `ENVIRONMENT=production`
  - `NEXT_PUBLIC_APP_URL=https://caferoam.tw`
  - `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`
- [ ] Set Railway internal networking URL:
  - `BACKEND_INTERNAL_URL=http://api.railway.internal:8000`
- [ ] Generate and set a new `ANON_SALT` (must not reuse staging value):
  ```bash
  openssl rand -hex 32
  ```
- [ ] Confirm all service API keys are set (not the dev/staging placeholders):
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_MAPBOX_TOKEN`
  - `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- [ ] Trigger a deploy on both services (web + api) and wait for health checks to go green

---

## Phase 3: Custom Domain

- [ ] In Railway → web service → **Settings → Domains**, add `caferoam.tw`
- [ ] Railway will show a CNAME target — add it to your DNS provider:
  ```
  Type:  CNAME
  Name:  @  (or caferoam.tw)
  Value: <railway-provided-hostname>
  TTL:   3600
  ```
- [ ] Wait for SSL cert provisioning (typically 2–5 minutes)
- [ ] Verify HTTPS:
  ```bash
  curl -I https://caferoam.tw
  # Expect: HTTP/2 200
  ```

---

## Phase 4: Better Stack Uptime Monitoring

Follow `docs/ops/better-stack-setup.md` — summary:

- [ ] Create **API Health** monitor: `https://api.caferoam.com/health` — interval 60s
- [ ] Create **Web Health** monitor: `https://caferoam.com` — interval 60s
- [ ] Create **API Deep Health** monitor: `https://api.caferoam.com/health/deep` — interval 300s
- [ ] Create alert escalation policy (Slack/Discord + email, escalate after 15 min)
- [ ] Assign alert policy to all 3 monitors
- [ ] Create status page → custom domain `status.caferoam.com`
  - Add CNAME record in DNS per Better Stack instructions

---

## Phase 5: Verify Observability

- [ ] **Sentry:** Open prod URL in browser, trigger a forced error (or check Sentry's "Send Test Event" button) — confirm event appears in Sentry with `environment: production`
- [ ] **PostHog:** Visit prod URL — confirm pageview events appear in PostHog Live Events within 30 seconds
- [ ] **GA4:** Visit prod URL — confirm hit appears in GA4 Realtime report

---

## Phase 6: Automated Smoke Test

Run the smoke test script against production:

```bash
BASE_URL=https://caferoam.tw API_URL=https://api.caferoam.com bash scripts/smoke-test.sh
```

- [ ] All automated checks pass (exit code 0)

---

## Phase 7: Manual Critical Path Validation

These flows cannot be automated — verify each manually in an incognito window:

- [ ] **Sign up** — create a new account with a real email; confirm email arrives from `hello@caferoam.tw`
- [ ] **Search** — search for "咖啡" — results appear within 3 seconds
- [ ] **Shop detail** — tap a shop pin / result card — detail page loads with map
- [ ] **Create a list** — create a list named "Beta Test" — appears in profile
- [ ] **Check-in** — submit a check-in with a photo at any shop — polaroid appears in profile

---

## Phase 8: Beta Readiness Sign-Off

- [ ] All phases above complete with no blockers
- [ ] Update `ASSUMPTIONS.md`: mark **B3** as validated ("prod URL is live, beta recruitment can begin")
- [ ] Move DEV-76 to **Done** in Linear
- [ ] Announce in Threads / personal network per ASSUMPTION B3 (30–50 beta users)

---

## Rollback Plan

| Failure | Recovery |
|---------|----------|
| Migration fails mid-apply | Supabase dashboard → **Database → Backups** → restore to pre-migration snapshot |
| Railway deploy fails | Railway dashboard → service → **Deployments** → click "Rollback" on previous green deploy |
| Custom domain / SSL stuck | Temporarily point users to Railway's default `.up.railway.app` URL while investigating |
| Observability not receiving events | Check `ENVIRONMENT=production` is set; Sentry/PostHog keys are prod keys (not staging) |
| Smoke test fails on deep health | Check `SUPABASE_SERVICE_ROLE_KEY` is the prod key; run `supabase db diff --linked` to confirm migrations applied |

**Never tear down staging** — it remains the fallback environment and the reference for parity checks.
