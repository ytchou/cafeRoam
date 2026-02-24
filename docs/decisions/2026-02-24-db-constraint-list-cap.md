# ADR: Postgres Trigger Constraint for 3-List Cap

Date: 2026-02-24

## Decision
Enforce the maximum 3 lists per user via a Postgres `BEFORE INSERT` trigger on the `lists` table, rather than application-level count-then-insert.

## Context
CLAUDE.md mandates "Max 3 lists per user. Enforce at the API level." The initial implementation checked `count(*)` then inserted in separate operations, creating a TOCTOU race condition where concurrent requests could bypass the cap.

## Alternatives Considered
- **Supabase RPC with SELECT FOR UPDATE**: Create a Postgres function that acquires a row lock before counting and inserting. Rejected: more complex, requires the service to call a specific RPC instead of a standard insert.
- **Application-level advisory lock**: Use Postgres advisory locks in Python. Rejected: fragile (lock must be released on all code paths), adds complexity, and doesn't protect against direct DB access.

## Rationale
- Impossible to bypass — constraint is enforced at the database level regardless of which code path inserts
- Simple implementation — standard trigger pattern
- Service code simplified — just insert and catch the exception
- Race condition eliminated — trigger runs within the INSERT transaction

## Consequences
- Advantage: Atomic enforcement, no race conditions
- Advantage: Works regardless of access path (API, direct DB, migration scripts)
- Disadvantage: Error message from DB is generic — service must catch and translate to user-friendly HTTP 400
- Disadvantage: Cap value (3) is in SQL, not application config — changing it requires a migration
