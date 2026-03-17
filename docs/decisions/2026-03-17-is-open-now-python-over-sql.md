# ADR: is_open_now Logic in Python, Not SQL

Date: 2026-03-17

## Decision

Opening hours parsing and "is this shop open now?" checks run in Python application code, not as a Supabase RPC/SQL function.

## Context

The tarot draw endpoint needs to filter shops by whether they're currently open. The `opening_hours` field is a JSONB `list[str]` with human-readable strings like `"Monday: 9:00 AM - 6:00 PM"`. This format requires non-trivial parsing (day names, AM/PM, midnight-crossing ranges, missing days).

## Alternatives Considered

- **SQL/RPC function (plpgsql)**: Parse opening hours in a Supabase RPC function so filtering happens entirely in the database. Rejected: string parsing in plpgsql is painful to write, test, and debug. The format is scraper-dependent and may change.
- **Pre-computed `is_open` column updated by cron**: Store a boolean that a cron job refreshes every 15 minutes. Rejected: adds infrastructure complexity (cron worker), stale data between refreshes, and still needs the parser anyway.

## Rationale

The candidate set after PostGIS distance filtering is small (50–200 shops within 3–20km radius). Parsing opening hours for this many shops in Python is negligible in latency. Python's `datetime` and string parsing are straightforward to write and unit test. The parser lives in `backend/core/opening_hours.py` as a pure function with no external dependencies.

## Consequences

- Advantage: Easy to unit test, easy to update when scraper format changes, no migration needed
- Advantage: Can handle edge cases (midnight crossing, 24h) with clear Python logic
- Disadvantage: Cannot use `is_open_now` as a SQL WHERE clause — filtering happens after the initial geo query, so we fetch slightly more rows than needed
