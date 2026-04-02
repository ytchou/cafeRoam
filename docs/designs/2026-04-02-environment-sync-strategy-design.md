# Design: Environment Sync Strategy

**Date:** 2026-04-02
**Ticket:** [DEV-176](https://linear.app/ytchou/issue/DEV-176)
**Status:** Approved

---

## Problem

Staging Supabase is out of sync with local dev — Find page loads no shops, Explore page is empty, auth/session behavior differs, and UI rendering diverges due to missing data. This blocks all staging-based testing and QA. With prod promotion (DEV-76) approaching, the same problem will repeat unless we define a repeatable sync strategy.

## Decision

Use pg_dump/pg_restore with table filtering to sync shop directory data between environments. A Python script (`scripts/sync_data.py`) provides audit, snapshot, promote, and restore subcommands. Makefile targets wrap the script for developer ergonomics.

## Data Ownership Model

| Environment | Owns                | Receives from                        |
| ----------- | ------------------- | ------------------------------------ |
| Local dev   | Nothing (consumer)  | Staging snapshots or repo seed files |
| Staging     | Shop directory data | Pipeline writes here                 |
| Prod        | User-generated data | Staging (validated shop data sync)   |

**Data flow:** Pipeline → staging → (validated sync) → prod

**Taxonomy:** Closed set, managed via admin API. Synced as part of shop directory data. The enrichment pipeline does not introduce new tags.

## Sync Scope

These tables flow staging → prod:

| Table             | Contents                                           |
| ----------------- | -------------------------------------------------- |
| `shops`           | Core shop directory (including `embedding` column) |
| `shop_photos`     | Scraped photos                                     |
| `shop_reviews`    | Scraped Google reviews (not user reviews)          |
| `shop_tags`       | Shop-to-taxonomy mappings                          |
| `taxonomy_tags`   | Tag definitions                                    |
| `shop_menu_items` | Menu data                                          |
| `shop_content`    | Enriched content                                   |

**Excluded** (per-environment, user-generated): `check_ins`, `lists`, `list_items`, `profiles`, `stamps`, `shop_followers`, `shop_claims`, `shop_submissions`, `activity_feed`, `community_note_likes`, `user_roles`, `search_events`, `search_cache`, `job_queue`, `admin_audit_logs`, `review_responses`, `shop_owner_tags`.

## Architecture

```
                    pipeline
                       │
                       ▼
┌─────────────┐   ┌─────────────┐   validated   ┌─────────────┐
│  Local Dev  │   │   Staging   │ ──── sync ───►│    Prod      │
│ (Supabase)  │   │ (Supabase)  │               │ (Supabase)   │
└─────────────┘   └─────────────┘               └─────────────┘
      ▲                  │                             │
      └── snapshot ──────┘                             │
      └── snapshot ────────────────────────────────────┘
```

## Components

### 1. `scripts/sync_data.py`

Core sync tooling script. Follows the `validate_supabase.py` pattern: standalone Python script, `DATABASE_URL` env var for connection, `uv run` execution.

**Subcommands:**

- **`audit`** — Connect to a remote DB, compare row counts and key data against expected baselines. Reports missing tables, empty tables, stale embeddings, missing enrichment fields.
- **`snapshot`** — pg_dump the sync-scope tables into a dated file: `supabase/snapshots/YYYY-MM-DD-<env>.sql`. Snapshot headers include source env, timestamp, row counts, script version.
- **`promote`** — Full pipeline: snapshot staging → validate snapshot → restore to prod. Fails fast if validation fails. Refuses to proceed without passing all gates.
- **`restore`** — Restore a snapshot file to any target DB. Used for both prod promotion and local dev refresh.

### 2. Makefile Targets

```makefile
audit-staging:      # Audit staging data parity
snapshot-staging:   # Snapshot staging shop data to dated file
promote-to-prod:   # Promote staging → prod (snapshot + validate + restore)
restore-snapshot:   # Restore a snapshot to local dev
```

### 3. Validation Gates (Before Prod Promotion)

| Check              | Threshold                                                 |
| ------------------ | --------------------------------------------------------- |
| Row counts         | shops > 0, taxonomy_tags > 0, shop_tags > 0               |
| Required fields    | All shops have `name`, `lat`, `lng`                       |
| Embeddings         | >80% of live shops have non-null `embedding`              |
| Taxonomy integrity | All `shop_tags.tag_id` reference valid `taxonomy_tags.id` |
| No orphaned photos | All `shop_photos.shop_id` exist in `shops`                |

### 4. Snapshot Storage

```
supabase/
  seeds/                    # Existing: bootstrap seed files (in git)
    shops_data.sql
    payment_methods_seed.sql
  snapshots/                # New: dated snapshots (gitignored)
    .gitkeep
    2026-04-02-staging.sql
    latest.sql              # symlink to most recent
```

Snapshots are gitignored (large, change frequently). The `seeds/` files remain in git as the bootstrap fallback.

### 5. Backup Strategy

Before every prod promotion:

1. Script automatically snapshots staging to a dated file
2. If promotion fails or staging data is corrupted, restore from the most recent good snapshot

## Data Flows

**Adding new shops (ongoing):**

1. Data pipeline runs on staging → writes to staging `shops` table
2. Enrichment worker runs on staging → fills enrichment fields + embeddings
3. `make audit-staging` → confirms data looks good
4. `make promote-to-prod` → snapshots staging, validates, restores to prod

**Refreshing local dev:**

1. `make snapshot-staging` → creates `supabase/snapshots/latest.sql`
2. `make restore-snapshot` → restores to local Supabase
3. Or: existing `make seed-shops` for the git-committed baseline

**Recovering from bad staging data:**

1. Find most recent good snapshot in `supabase/snapshots/`
2. `make restore-snapshot FILE=supabase/snapshots/<dated-file>.sql TARGET=staging`

## Error Handling

- All sync operations wrapped in transactions — if restore fails mid-way, target DB rolls back
- `promote` refuses to run if validation fails
- Snapshot files include header comment with source env, timestamp, row counts, script version

## Alternatives Rejected

- **Supabase REST API upserts:** Too slow for embedding columns (1536-dim vectors). Re-invents what pg_dump does natively. More code for no benefit.
- **Supabase CLI `db dump`:** Dumps entire database, not specific tables. Would need post-dump filtering. Ties tooling to CLI state.

## Testing Classification

- **New e2e journey?** No — developer ops tooling, no new user-facing path.
- **Coverage gate impact?** No — standalone script, doesn't modify existing services.

## Testing Strategy

- Unit tests for validation logic (row count checks, field presence checks)
- Integration test: snapshot local dev → restore to test DB → verify row counts match
- No E2E tests needed

## Sub-Issues

1. [DEV-177](https://linear.app/ytchou/issue/DEV-177) — Audit staging Supabase data gaps (S, Foundation)
2. [DEV-178](https://linear.app/ytchou/issue/DEV-178) — Build sync_data.py with audit/snapshot/promote/restore subcommands (M, Foundation) — blocked by DEV-177
3. [DEV-179](https://linear.app/ytchou/issue/DEV-179) — Add Makefile targets for environment sync operations (S) — blocked by DEV-178
4. [DEV-180](https://linear.app/ytchou/issue/DEV-180) — Write environment sync strategy documentation (S)
