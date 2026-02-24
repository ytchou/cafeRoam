# ADR: Postgres Trigger for Check-In Atomicity

Date: 2026-02-24

## Decision
Use a Postgres `AFTER INSERT` trigger on `check_ins` to atomically create the stamp record and queue the menu photo enrichment job, rather than performing these as separate application-level inserts.

## Context
The check-in creation flow requires three writes: check-in insert, stamp insert, and (optionally) job queue insert for menu photo enrichment. The initial implementation performed these as three sequential Supabase client calls with no transaction wrapping, risking orphan records on partial failure. The existing ADR (2026-02-24-hybrid-worker-triggers) already specified this trigger approach.

## Alternatives Considered
- **Supabase RPC transaction**: Wrap all three inserts in a single Postgres function. Rejected: achieves atomicity but doesn't match the existing ADR's trigger-based design, and couples the service to a specific RPC signature.
- **Application-level try/rollback**: Keep three inserts in Python, add manual rollback on failure. Rejected: rollback is not atomic (the rollback itself can fail), and the Supabase REST API doesn't support multi-statement transactions.

## Rationale
- Matches the existing ADR for hybrid worker triggers
- Atomic by design — trigger runs in the same transaction as the INSERT
- Decouples the service layer from enrichment concerns (service only inserts check-in)
- Stamp creation is guaranteed — impossible to have a check-in without a stamp

## Consequences
- Advantage: True atomicity at the database level
- Advantage: Simpler service code — only one insert call
- Disadvantage: Business logic split between Python (service) and SQL (trigger) — requires reading both to understand the full check-in flow
- Disadvantage: Trigger must be maintained alongside schema migrations
