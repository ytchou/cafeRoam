# ADR: Move SET LOCAL inside PL/pgSQL function bodies for pgBouncer compatibility

Date: 2026-03-30

## Decision

Move all `SET LOCAL` statements inside PL/pgSQL function bodies rather than issuing them as separate SQL statements, to ensure compatibility with Supabase cloud's pgBouncer transaction mode.

## Context

Supabase cloud uses pgBouncer in transaction mode by default. In this mode, connections are returned to the pool between transactions, and `SET LOCAL` statements issued as standalone SQL are dropped at statement boundaries. The search cache RPC uses `SET LOCAL hnsw.ef_search = 40` to tune HNSW index probing depth, but this optimization silently fails on cloud — queries still work but without the tuned ef_search parameter.

## Alternatives Considered

- **Remove the optimization entirely**: Drop `SET LOCAL hnsw.ef_search` and accept default ef_search. Rejected: the default (40 in most pg configs, but not guaranteed) may produce inconsistent search quality across environments.
- **Switch to session-mode pgBouncer**: Would preserve `SET LOCAL` semantics. Rejected: session mode severely limits connection concurrency on Supabase cloud (one connection per concurrent user), incompatible with production scaling.
- **Use `ALTER FUNCTION ... SET` (function-level GUC)**: Set the parameter as a function-level default. Rejected: `hnsw.ef_search` is a custom GUC from pgvector, and `ALTER FUNCTION SET` for custom GUCs has inconsistent support across Postgres versions.

## Rationale

Inside a PL/pgSQL function body, `SET LOCAL` is scoped to the function's implicit transaction block. pgBouncer transaction mode preserves the transaction boundary during function execution, so `SET LOCAL` inside the function body survives correctly. This is the standard Supabase-recommended pattern for transaction-mode-safe GUC changes.

## Consequences

- Advantage: Search cache RPC works identically on local and cloud Supabase
- Advantage: Pattern is reusable — any future RPC needing GUC tuning follows the same approach
- Disadvantage: `SET LOCAL` is less visible when embedded in function body (vs. a standalone SQL call) — but this is a minor readability tradeoff
