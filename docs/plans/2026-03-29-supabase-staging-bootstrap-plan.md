# Supabase Staging Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Design Doc:** [docs/designs/2026-03-29-supabase-staging-bootstrap-design.md](docs/designs/2026-03-29-supabase-staging-bootstrap-design.md)

**Spec References:** [SPEC.md#5-compliance--security](SPEC.md#5-compliance--security) (data residency)

**PRD References:** —

**Goal:** Bootstrap the Supabase staging project (`caferoam-staging`) with full schema, storage, auth, seed data, and wire credentials to Railway.

**Architecture:** Single Supabase cloud project in Tokyo (ap-northeast-1). Railway staging services (web + api) connect via env vars. Supabase CLI pushes local migrations to cloud. Railway CLI sets env vars on staging services.

**Tech Stack:** Supabase CLI, Railway CLI, psql, 1Password

**Acceptance Criteria:**
- [x] All 78 migrations applied to staging Supabase without errors
- [x] 164 shops queryable in staging database
- [x] Auth endpoint responds and a test user can authenticate
- [x] All 4 storage buckets exist with RLS policies
- [x] Railway staging services have all Supabase env vars set (credentials in 1Password; pending DEV-73 service deployment)

---

### Task 1: Install Railway CLI (DEV-77)

**No test needed — CLI installation, not application code.**

**Step 1: Install Railway CLI via Homebrew**

```bash
brew install railway
```

If Homebrew is not preferred, alternative: `npm i -g @railway/cli`

**Step 2: Verify installation**

```bash
railway --version
```

Expected: Version number printed (e.g., `railway 3.x.x`)

**Step 3: Authenticate**

```bash
railway login
```

This opens a browser for OAuth. Follow the prompts to authenticate.

**Step 4: Link to CafeRoam Railway project**

```bash
cd /Users/ytchou/Project/caferoam
railway link
```

Select the CafeRoam project when prompted. This creates/updates `.railway/` config locally.

**Step 5: Verify link**

```bash
railway status
```

Expected: Shows the linked project name, environment, and services.

---

### Task 2: Create Supabase staging project via dashboard (DEV-78)

**No test needed — manual dashboard operation.**

**Step 1: Create project in Supabase dashboard**

1. Go to [app.supabase.com](https://app.supabase.com) → "New Project"
2. **Name:** `caferoam-staging`
3. **Database Password:** Generate a strong password (32+ chars)
4. **Region:** Northeast Asia (Tokyo) — `ap-northeast-1`
5. **Plan:** Free tier is fine for staging
6. Click "Create new project" — wait ~2 minutes for provisioning

**Step 2: Collect credentials**

From the project dashboard → Settings → API, note:

| Credential | Location in dashboard |
|---|---|
| Project ref | Settings → General → Reference ID |
| Project URL | Settings → API → Project URL |
| Anon key | Settings → API → `anon` `public` |
| Service role key | Settings → API → `service_role` (click "Reveal") |
| JWT secret | Settings → API → JWT Settings → JWT Secret |
| DB connection string | Settings → Database → Connection string → URI |

**Step 3: Store in 1Password**

Create a new 1Password item named `CafeRoam Staging — Supabase` with all 6 credentials above plus the DB password.

**Step 4: Verify pgvector**

In the Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

Expected: Returns a version (e.g., `0.7.0`). If the extension doesn't exist, the first migration (`20260224000001_enable_extensions.sql`) will handle it — but verifying early catches issues.

---

### Task 3: Push all 78 migrations to staging (DEV-79)

**No test needed — migration DDL. Correctness verified by `supabase db push` exit code and manual inspection.**

**Depends on:** Task 2 (staging project must exist)

**Step 1: Link Supabase CLI to staging project**

```bash
cd /Users/ytchou/Project/caferoam
supabase link --project-ref <PROJECT_REF>
```

Replace `<PROJECT_REF>` with the Reference ID from Task 2. Enter the DB password when prompted.

**Step 2: Push all migrations**

```bash
supabase db push
```

Expected: All 78 migrations applied sequentially. Output should show each migration name with a success indicator. Zero errors.

**Troubleshooting:**
- If pgvector extension fails: ensure Step 4 of Task 2 was completed
- If a migration fails mid-push: note the failing migration name, investigate the error, fix locally if needed, re-run `supabase db push` (it resumes from where it left off)
- If storage bucket INSERT fails: proceed — Task 3 Step 4 handles manual bucket creation

**Step 3: Verify schema**

In the Supabase SQL Editor (or via `psql`), run these verification queries:

```sql
-- Table count (should match local)
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- RLS policy count
SELECT count(*) FROM pg_policies WHERE schemaname = 'public';

-- HNSW indexes on embedding columns
SELECT indexname, indexdef FROM pg_indexes
WHERE indexdef LIKE '%hnsw%';

-- RPCs (functions)
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```

Compare counts with local Supabase (run the same queries against `127.0.0.1:54322`).

**Step 4: Verify storage buckets**

```sql
SELECT id, name, public FROM storage.buckets ORDER BY name;
```

Expected 4 rows:
- `avatars` (public: true)
- `checkin-photos` (public: false)
- `claim-proofs` (public: false)
- `menu-photos` (public: false)

If any are missing (cloud Supabase may not support `INSERT INTO storage.buckets` in migrations), create them manually via dashboard → Storage → "New bucket".

**Step 5: Verify storage RLS policies**

```sql
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'storage';
```

Should show RLS policies for each bucket (upload, download, delete rules).

**Step 6: Commit verification notes (optional)**

No code changes needed — this is all verification. Move on to Task 4.

---

### Task 4: Seed staging DB with shops and admin user (DEV-80)

**No test needed — data seeding operation.**

**Depends on:** Task 3 (schema must be in place)

**Step 1: Get the staging DB connection string**

From 1Password or Supabase dashboard → Settings → Database → Connection string (URI format).

Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`

Note: Use port `5432` (direct connection), not `6543` (pooler), for seeding — large INSERTs may timeout through the pooler.

**Step 2: Seed shop data**

```bash
psql "<STAGING_DB_CONNECTION_STRING>" < supabase/seeds/shops_data.sql
```

Expected: 164 shops inserted (the seed file handles the full dataset including shop_tags, enrichment data, etc.).

**Step 3: Verify seed data**

```sql
-- Connect to staging
psql "<STAGING_DB_CONNECTION_STRING>"

-- Check shop count
SELECT count(*) FROM shops WHERE status = 'live';
-- Expected: 164

-- Spot-check a shop
SELECT name, city, district FROM shops LIMIT 3;
```

**Step 4: Create staging admin user**

Use the Supabase Auth Admin API (equivalent of `make restore-seed-user` but pointing at staging):

```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/admin/users" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "caferoam.tw@gmail.com",
    "password": "00000000",
    "email_confirm": true,
    "user_metadata": { "display_name": "Admin" }
  }'
```

Replace `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` with values from 1Password.

Expected: JSON response with user object containing an `id` field.

**Step 5: Note the admin user ID**

Save the returned user `id` — it will be needed for the `admin_user_ids` config in Railway env vars (DEV-73 scope, but good to note now).

---

### Task 5: Configure staging Auth (DEV-81)

**No test needed — dashboard configuration.**

**Step 1: Configure email auth**

In Supabase dashboard → Authentication → Providers:
- **Email** should be enabled by default
- **Confirm email:** Toggle OFF (disabled) — staging doesn't need email confirmation friction
- **Enable automatic account linking:** ON

**Step 2: Set Site URL**

Authentication → URL Configuration:
- **Site URL:** `https://<RAILWAY_STAGING_DOMAIN>` (get this from Railway dashboard, or use a placeholder like `https://caferoam-staging.up.railway.app` — update after DEV-73 deploys)

**Step 3: Add redirect URLs**

Add these redirect URLs:
- `https://<RAILWAY_STAGING_DOMAIN>/**`
- `http://localhost:3000/**` (for local dev pointing at staging)

**Step 4: Verify auth endpoint**

```bash
curl -s "https://<PROJECT_REF>.supabase.co/auth/v1/" \
  -H "apikey: <ANON_KEY>" | head -c 200
```

Expected: JSON response (not an error page).

---

### Task 6: Wire Supabase credentials to Railway env vars (DEV-82)

**No test needed — environment variable configuration.**

**Depends on:** Task 1 (Railway CLI), Task 2 (Supabase credentials)

**Step 1: Select the staging environment in Railway**

```bash
railway environment staging
```

If a staging environment doesn't exist yet, create one in the Railway dashboard first (Project → Environments → "New Environment" → name: `staging`).

**Step 2: Set Supabase env vars for the `web` service**

```bash
railway service web

railway variables set \
  NEXT_PUBLIC_SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY>" \
  SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"
```

**Step 3: Set Supabase env vars for the `api` service**

```bash
railway service api

railway variables set \
  SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
  SUPABASE_ANON_KEY="<ANON_KEY>" \
  SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" \
  SUPABASE_JWT_SECRET="<JWT_SECRET>" \
  ENVIRONMENT="staging" \
  ANON_SALT="<GENERATE_A_UNIQUE_SALT>" \
  SITE_URL="https://<RAILWAY_STAGING_DOMAIN>"
```

Note: The backend reads env vars via `pydantic_settings` (see `backend/core/config.py`). Variable names are case-insensitive and match the `Settings` class fields.

Important: `ANON_SALT` must NOT be the default `caferoam-dev-salt` — the Settings validator will reject it in non-development environments. Generate a unique value: `openssl rand -hex 16`.

**Step 4: Verify env vars are set**

```bash
railway service web
railway variables
# Should show NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

railway service api
railway variables
# Should show SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, ENVIRONMENT, ANON_SALT, SITE_URL
```

**Step 5: Update 1Password**

Add the Railway env var values to the 1Password item created in Task 2, or create a separate `CafeRoam Staging — Railway` item.

---

### Task 7: Full verification (DEV-83)

**No test needed — manual verification checklist.**

**Depends on:** Tasks 3, 4, 5, 6

Run through every item on the verification checklist:

**Step 1: Schema parity**

```sql
-- On staging (via psql or SQL Editor)
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- On local (port 54322)
-- Compare the two counts — they should match
```

**Step 2: RLS parity**

```sql
SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
-- Compare with local
```

**Step 3: HNSW indexes**

```sql
SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%hnsw%';
-- Should return indexes on embedding columns
```

**Step 4: Storage buckets**

```sql
SELECT id, name, public FROM storage.buckets ORDER BY name;
-- Expected: avatars, checkin-photos, claim-proofs, menu-photos
```

**Step 5: Auth endpoint**

```bash
curl -s "https://<PROJECT_REF>.supabase.co/auth/v1/" -H "apikey: <ANON_KEY>"
```

**Step 6: Seed data**

```sql
SELECT count(*) FROM shops WHERE status = 'live';
-- Expected: 164
```

**Step 7: Admin user auth test**

```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email": "caferoam.tw@gmail.com", "password": "00000000"}'
```

Expected: JSON with `access_token`, `refresh_token`, and user object.

**Step 8: Railway env vars**

```bash
railway service web && railway variables
railway service api && railway variables
```

Verify all Supabase-related vars are present.

**Step 9: Document results**

If all checks pass, update DEV-71 with a completion comment listing verification results. Mark DEV-71 and all sub-issues as Done.

---

## Execution Waves

```mermaid
graph TD
    T1[Task 1: Railway CLI] --> T6[Task 6: Wire credentials]
    T2[Task 2: Create Supabase project] --> T3[Task 3: Push migrations]
    T2 --> T6
    T3 --> T4[Task 4: Seed data]
    T3 --> T7[Task 7: Verification]
    T4 --> T7
    T5[Task 5: Configure Auth] --> T7
    T6 --> T7

    subgraph "Wave 1"
        T1
        T2
    end
    subgraph "Wave 2"
        T3
        T5
    end
    subgraph "Wave 3"
        T4
        T6
    end
    subgraph "Wave 4"
        T7
    end
```

**Wave 1** (parallel — no dependencies):
- Task 1: Install Railway CLI (DEV-77)
- Task 2: Create Supabase staging project (DEV-78)

**Wave 2** (parallel — depends on Wave 1):
- Task 3: Push migrations ← Task 2
- Task 5: Configure Auth ← Task 2 (dashboard operations, independent of migrations)

**Wave 3** (parallel — depends on Wave 2):
- Task 4: Seed data ← Task 3
- Task 6: Wire credentials to Railway ← Task 1, Task 2

**Wave 4** (sequential — depends on all):
- Task 7: Full verification ← Tasks 3, 4, 5, 6

**Note:** This is primarily a human-driven infrastructure task. Most steps require manual dashboard interaction, CLI authentication, or credential handling. The executor assists by providing exact commands and verification queries, but the human must perform dashboard operations and handle secrets.
