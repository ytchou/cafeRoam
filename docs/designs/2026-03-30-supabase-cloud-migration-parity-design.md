# Design: Supabase Cloud Migration Parity Validation (DEV-72)

Date: 2026-03-30
Hat: CTO
Linear: DEV-72 (parent), DEV-86/87/88 (sub-issues)

## Goal

Verify that 78 local Supabase migrations apply identically on cloud — catching pgBouncer, RLS enforcement, trigger, and pgvector differences before users hit staging.

## Architecture

A standalone Python script (`scripts/validate-supabase.py`) connects to any Supabase instance via direct Postgres connection (bypassing pgBouncer) and runs a suite of parity checks. Outputs a structured pass/fail report per category.

**Input:** `DATABASE_URL` env var — direct Postgres connection string (port 5432, not pooled 6543).

**Output:** Console report with pass/fail per check. Exit code 0 (all pass) or 1 (any fail).

## Check Categories

### 1. Schema Parity

- Count applied migrations in `supabase_migrations.schema_migrations` (expect 78+)
- Verify all expected tables exist (hardcoded list from local schema)
- Spot-check column names and types on critical tables: `shops`, `check_ins`, `lists`, `search_events`

### 2. RLS Validation

For each user-facing table (`check_ins`, `lists`, `list_items`, `user_profiles`, `shop_followers`, `claims`):
- Verify `rowsecurity` is enabled in `pg_class`
- Verify at least one policy exists in `pg_policies`
- Report: table name, RLS enabled (bool), policy count

### 3. Trigger Validation

- Verify `trg_checkin_after_insert` exists and is enabled on `check_ins`
- Verify `trg_enforce_max_lists` exists and is enabled on `lists`
- Verify trigger functions exist in `pg_proc`

### 4. pgvector Validation

- Verify `vector` extension is enabled (`pg_extension`)
- Verify HNSW index exists on `shops.embedding` (`pg_indexes`)
- Run a test cosine similarity query with a dummy 1536-dim zero vector to confirm the index is queryable

### 5. pgBouncer Compatibility

- Scan all user-defined function bodies in `pg_proc` for `SET LOCAL` usage
- Flag functions using `SET LOCAL` that would silently fail under pgBouncer transaction mode
- Specifically flag `SET LOCAL hnsw.ef_search` in search cache RPC

### 6. Storage Bucket Validation

- Verify expected buckets exist in `storage.buckets`: `check-in-photos`, `claim-proofs`

## pgBouncer Fix (DEV-87)

The search cache RPC (`search_shops_cached` or similar) uses `SET LOCAL hnsw.ef_search = 40;`. Under pgBouncer transaction mode (Supabase cloud default), `SET LOCAL` is dropped between statements, causing the HNSW ef_search optimization to silently not apply.

**Fix:** New migration that recreates the RPC with `SET LOCAL` inside the function body as the first statement. Inside a PL/pgSQL function body, `SET LOCAL` is scoped to the function's transaction and survives pgBouncer's statement boundary reset.

## Data Flow

```
scripts/validate-supabase.py
  +-- Connect via psycopg2 (direct Postgres URL, not pooled)
  +-- Run checks against pg_catalog, information_schema, pg_indexes
  +-- Print structured report (category -> check -> PASS/FAIL)
  +-- Exit 0 or 1
```

## Error Handling

- Connection failure: clear error explaining the need for direct (non-pooled) connection string (port 5432)
- Individual check failure: report as FAIL but continue all remaining checks
- Script always runs all checks regardless of individual failures

## Sub-Issues (execution order)

1. **DEV-86** (M, Foundation): Build the validation script with all 6 check categories
2. **DEV-87** (S, Foundation): Fix pgBouncer-unsafe `SET LOCAL` via new migration. Blocked by DEV-86.
3. **DEV-88** (S): Run script against staging, document results. Blocked by DEV-86 + DEV-87.

## Testing Classification

- [x] No new e2e journey — infrastructure tooling, not a user-facing feature
- [x] No critical-path service coverage impact — validation script is standalone; pgBouncer fix touches search cache RPC which already has coverage

## Alternatives Rejected

- **Manual checklist with copy-paste SQL**: fastest to create but not reusable across staging/prod/CI
- **Makefile + raw SQL files**: lower-level, harder to produce structured pass/fail output with exit codes
- **Flag-only for pgBouncer issue**: would ship known-broken search cache to staging
