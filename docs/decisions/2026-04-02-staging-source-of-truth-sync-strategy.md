# ADR: Staging as source of truth for shop data with pg_dump sync to prod

Date: 2026-04-02

## Decision
Shop directory data is owned by staging. The data pipeline writes to staging, and a validated pg_dump/pg_restore sync promotes shop data from staging to prod.

## Context
With staging and (soon) prod Supabase instances, we need a defined data ownership model and sync mechanism. Staging data had already drifted from local dev (DEV-80, DEV-144), causing empty pages and broken QA. Without a strategy, the same drift would affect prod.

## Alternatives Considered
- **Prod as source of truth (pipeline writes directly to prod)**: Rejected: risky — a bad pipeline run could corrupt live user-facing data with no safe review step.
- **Local seed file as source of truth (push up to staging/prod)**: Rejected: doesn't scale — the seed file is a bootstrap artifact, not an ongoing data management tool. New shops added via pipeline wouldn't flow through git commits.
- **Supabase REST API upserts**: Rejected: too slow for embedding vectors (1536-dim), more code for no benefit over native pg_dump.
- **Independent environments (schema-only sync)**: Rejected: leads to exactly the drift problem we're solving.

## Rationale
Staging-as-source gives a review layer between the data pipeline and production. Validation gates run before every promotion, catching data quality issues before they reach users. pg_dump/pg_restore is battle-tested Postgres tooling that handles schema, data, and constraints atomically. The existing `shops_data.sql` seed is already a pg_dump output, so this formalizes a pattern already in use.

## Consequences
- Advantage: Bad pipeline runs are caught on staging before reaching prod. Dated snapshots provide rollback points.
- Advantage: pg_dump is well-understood, produces human-inspectable SQL files, and handles vectors natively.
- Disadvantage: Full table replacement (TRUNCATE + restore), not incremental. Acceptable for ~700 shops but would need to move to incremental upserts at 10K+ shops.
- Disadvantage: Staging becomes a "pre-prod" database that can't be freely blown away for testing without losing the current shop data state. Mitigated by snapshot backups.
