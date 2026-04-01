# ADR: Normalize opening_hours to minutes-since-midnight structured format

Date: 2026-04-01

## Decision

Store `opening_hours` as `[{day: int, open: int | null, close: int | null}]` where `open`/`close` are minutes since midnight, absence means unknown, and `open: null` means confirmed closed.

## Context

`opening_hours` was stored as localized strings scraped from Google Maps via Apify (e.g. `"星期一: 12:00 to 23:00"` or `"Monday: 9:00 AM - 6:00 PM"` depending on scraper language setting). The `is_open_now` function had to parse these strings at runtime, handling multiple day-name formats and time formats. DEV-147 exposed that a locale change in the scraper could silently break the Open Now filter.

## Alternatives Considered

- **Keep `text[]` with normalised English strings only**: Translate all day names to English at ingest. Rejected: still brittle string parsing at runtime; a different scraper locale breaks it again; translation is unnecessary work.
- **Always-7-entry array with explicit `closed` flag**: `[{day: 0, open: 720, close: 1380, closed: false}, ...]` for all 7 days. Rejected: requires a third `unknown: true` field to preserve the 3-state semantics, adding schema complexity with no benefit.
- **SQL stored procedure migration**: PL/pgSQL parsing of the old string format. Rejected: verbose, fragile, harder to test than reusing the existing Python parsing logic.

## Rationale

Minutes-since-midnight integers eliminate all locale dependency from the runtime check — `is_open_now` becomes pure arithmetic. The DB column is already `JSONB` so no schema migration is needed. The existing Python parsing helpers in `opening_hours.py` are reused for both the ingest normalizer and the one-time migration script, keeping the logic in one place.

The absence-means-unknown convention preserves the existing 3-state `bool | None` return value of `is_open_now` without adding fields to the schema.

## Consequences

- Advantage: `is_open_now` is locale-proof — any scraper language works.
- Advantage: No schema migration; column is already JSONB.
- Advantage: Pure arithmetic is faster and easier to test than regex-based parsing.
- Disadvantage: Human-readable hours are no longer directly visible when querying the DB (need to decode minutes to wall-clock time). Acceptable for an operational data field.
- Disadvantage: One-time data migration required for 164 existing rows before deploy.
