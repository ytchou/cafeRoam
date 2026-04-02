# DEV-49: Security Review Pre-Launch — Remediation Plan

## Context

Pre-beta-launch security audit covering RLS policy gaps, PDPA cascade safety, PII scrubbing, and rate limiting. Blocks DEV-58 (beta recruitment) and DEV-59 (Threads launch). Audit found 7 actionable issues across 3 domains.

## Findings Summary

| #   | Issue                                                                                      | Severity | Domain   |
| --- | ------------------------------------------------------------------------------------------ | -------- | -------- |
| 1   | 4 tables missing RLS (`search_cache`, `vibe_collections`, `batch_runs`, `batch_run_shops`) | Medium   | RLS      |
| 2   | 3 owner tables lack `ON DELETE CASCADE` safety net                                         | High     | PDPA     |
| 3   | `admin_claims.py` leaks raw admin UUID to PostHog                                          | Critical | PDPA     |
| 4   | Frontend Sentry configs don't explicitly set `sendDefaultPii: false`                       | Medium   | Sentry   |
| 5   | No IP-based rate limit on `/submissions`                                                   | Medium   | Auth/API |
| 6   | ANON_SALT rotation plan undocumented                                                       | Low      | PDPA     |
| 7   | No `before_send` Sentry hook for PII scrubbing                                             | Low      | Sentry   |

**What passed (no action needed):**

- All 65 API endpoints use correct auth dependencies
- All user-facing tables except 4 have correct RLS policies
- PostHog anonymization via SHA-256 + ANON_SALT works correctly
- Backend Sentry has `send_default_pii=False` with test coverage
- Per-user rate limiting on `/submissions` is correct (5/day)
- Account deletion cascade covers all user-data tables

## Implementation Plan

### Step 1: Migration — Enable RLS on 4 tables

**File:** `supabase/migrations/YYYYMMDD000001_security_audit_enable_missing_rls.sql`

```sql
-- search_cache: internal, service-role only
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- batch_runs: internal, service-role only
ALTER TABLE batch_runs ENABLE ROW LEVEL SECURITY;

-- batch_run_shops: internal, service-role only
ALTER TABLE batch_run_shops ENABLE ROW LEVEL SECURITY;

-- vibe_collections: public read, no writes via PostgREST
ALTER TABLE vibe_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vibe_collections_public_read" ON vibe_collections
  FOR SELECT USING (true);
```

### Step 2: Migration — Add ON DELETE CASCADE to 3 owner FKs

**File:** `supabase/migrations/YYYYMMDD000002_security_audit_owner_cascade.sql`

Drop and re-add FK constraints on:

- `review_responses.owner_id` → `auth.users(id) ON DELETE CASCADE`
- `shop_content.owner_id` → `auth.users(id) ON DELETE CASCADE`
- `shop_owner_tags.owner_id` → `auth.users(id) ON DELETE CASCADE`

Pattern: `ALTER TABLE x DROP CONSTRAINT ...; ALTER TABLE x ADD CONSTRAINT ... REFERENCES auth.users(id) ON DELETE CASCADE;`

Need to read each migration file to get the exact constraint names.

### Step 3: Fix PII leak in admin_claims.py

**File:** `backend/api/admin_claims.py`

Lines 69 and 92: Replace `distinct_id=user["id"]` with:

```python
distinct_id=anonymize_user_id(user["id"], salt=settings.anon_salt)
```

Import `anonymize_user_id` from `core.anonymize` and `settings` from `core.config`.

### Step 4: Frontend Sentry hardening

**Files:**

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Add `sendDefaultPii: false` to each `Sentry.init()` call.

### Step 5: IP-based rate limiting on /submissions

**Approach:** Add `slowapi` dependency and apply per-IP rate limit to the submissions endpoint.

**Files:**

- `backend/pyproject.toml` — add `slowapi` dependency
- `backend/middleware/rate_limit.py` — create rate limiter instance
- `backend/api/submissions.py` — add `@limiter.limit("10/hour")` decorator to POST endpoint
- `backend/main.py` — register slowapi exception handler

The IP limit (10/hour) is a wider safety net than the per-user limit (5/day). It prevents account-farming abuse without affecting normal usage.

### Step 6: Document ANON_SALT rotation plan

**File:** `docs/decisions/2026-04-02-anon-salt-rotation-plan.md`

ADR documenting: rotation procedure, impact (all PostHog distinct_ids reset), when to rotate (compromise, annual), acceptable analytics discontinuity.

### Step 7: Add before_send Sentry hook (defense-in-depth)

**Files:**

- `backend/main.py` — add `before_send` callback that strips any `user` context from events
- `sentry.client.config.ts` — add `beforeSend` callback

## Critical Files

| File                                  | Action                                      |
| ------------------------------------- | ------------------------------------------- |
| `supabase/migrations/new_rls.sql`     | Create (RLS fixes)                          |
| `supabase/migrations/new_cascade.sql` | Create (CASCADE fixes)                      |
| `backend/api/admin_claims.py`         | Edit (PII fix, lines 69, 92)                |
| `sentry.client.config.ts`             | Edit (sendDefaultPii)                       |
| `sentry.server.config.ts`             | Edit (sendDefaultPii)                       |
| `sentry.edge.config.ts`               | Edit (sendDefaultPii)                       |
| `backend/pyproject.toml`              | Edit (add slowapi)                          |
| `backend/middleware/rate_limit.py`    | Create (rate limiter)                       |
| `backend/api/submissions.py`          | Edit (IP rate limit)                        |
| `backend/main.py`                     | Edit (slowapi handler + Sentry before_send) |

## Verification

1. `supabase db diff` — confirm migrations apply cleanly
2. `supabase db push` — apply to local
3. Query `pg_tables` + `pg_policies` to confirm all tables have RLS
4. Run existing backend tests: `cd backend && pytest`
5. Run existing frontend build: `pnpm build`
6. Verify admin_claims analytics test still passes
7. Manual test: attempt direct PostgREST access to `vibe_collections` INSERT (should be denied)
8. Manual test: attempt direct PostgREST access to `batch_runs` SELECT (should be denied)

## Testing Classification

- [ ] No new e2e journey — hardening existing paths only
- [x] Coverage gate: verify `admin_claims.py` fix doesn't break analytics tests
