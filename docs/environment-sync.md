# Environment Sync Strategy

> **Design doc:** [docs/designs/2026-04-02-environment-sync-strategy-design.md](designs/2026-04-02-environment-sync-strategy-design.md)
> **ADR:** [docs/decisions/2026-04-02-staging-source-of-truth-sync-strategy.md](decisions/2026-04-02-staging-source-of-truth-sync-strategy.md)

## Data Ownership

| Environment | Owns | Receives from |
|-------------|------|---------------|
| **Local dev** | Nothing (consumer) | Staging snapshots or repo seed files |
| **Staging** | Shop directory data | Data pipeline writes here |
| **Prod** | User-generated data | Staging (validated shop data sync) |

## Sync Scope

These tables sync staging → prod:

- `shops` (including `embedding` column)
- `shop_photos`, `shop_reviews` (scraped, not user reviews)
- `shop_tags`, `taxonomy_tags`
- `shop_menu_items`, `shop_content`

**Excluded:** All user-generated tables (check_ins, lists, profiles, stamps, etc.)

## Commands

### Audit staging data quality

```bash
DATABASE_URL=postgresql://... make audit-staging
```

Checks: row counts, required fields (name/lat/lng), embedding coverage (>80%), taxonomy integrity, orphaned photos.

### Snapshot staging to dated file

```bash
DATABASE_URL=postgresql://... make snapshot-staging
```

Creates `supabase/snapshots/YYYY-MM-DD-staging.sql` and updates `latest.sql` symlink.

### Promote staging → prod

```bash
STAGING_DATABASE_URL=... PROD_DATABASE_URL=... make promote-to-prod
```

Pipeline: audit staging → snapshot → restore to prod. Aborts if audit fails.

### Restore snapshot to local dev

```bash
make restore-snapshot                                    # uses latest.sql → local
make restore-snapshot FILE=supabase/snapshots/2026-04-02-staging.sql  # specific file
```

### Recover from bad staging data

```bash
make restore-snapshot FILE=supabase/snapshots/<last-good-date>-staging.sql TARGET=<staging-url>
```

## When to Sync

- **After pipeline runs on staging:** Run `make audit-staging` to verify data quality
- **Before releases:** Run `make promote-to-prod` to push latest shop data to prod
- **After migrations:** Run `make audit-staging` to confirm no data loss
- **For local dev refresh:** Run `make snapshot-staging` then `make restore-snapshot`

## Connection Strings

All commands use direct Postgres connection URLs (port 5432), not pgBouncer (port 6543):

```
# Local
postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Staging/Prod
postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
```

Find connection strings in: Supabase Dashboard → Project Settings → Database → Connection string (Direct).
