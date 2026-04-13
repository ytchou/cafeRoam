# ADR: Hardcode "Google Maps" as Review Source in UI

Date: 2026-04-13

## Decision

Hardcode "Google Maps" as the review source label in the ShopIdentity/RatingBadge component UI, without adding a `review_source` column to the database schema.

## Context

Users need to see where review counts come from to build trust (per DEV-327). Currently, all review data comes from a single source: Google Maps via Apify scraping. We need to display attribution (e.g., "120 reviews on Google Maps") but must decide whether to:
1. Hardcode the source as "Google" in the UI
2. Add a `review_source` database column for future flexibility
3. Track separate counts for Google vs. community reviews now

## Alternatives Considered

- **Add `review_source` DB column**: Add a string/enum column to the `shops` table to track the source of each review count. Rejected: Over-engineering for a single data source. Adds migration complexity, schema bloat, and API contract changes with no immediate benefit.

- **Separate Google vs. community counts now**: Add a `community_checkin_count` column alongside `review_count`, display both. Rejected: Premature — we have no meaningful community check-in data yet. Deferred to DEV-331 (after traffic milestone).

## Rationale

- **YAGNI principle**: We have exactly one review source (Google Maps). Adding schema flexibility now violates YAGNI.
- **Low migration cost later**: When we add other sources (Yelp, TripAdvisor, or community reviews), we can add the `review_source` column then. The UI change will be localized to the RatingBadge component.
- **Faster to ship**: Hardcoding eliminates backend work (migration, API changes, scraper updates), reducing DEV-327 to a frontend-only change.
- **Clear path to future flexibility**: DEV-331 already tracks the follow-up work for community counts. When we hit that milestone, we'll revisit the data model.

## Consequences

**Advantages:**
- Faster implementation (frontend-only, no migration)
- Simpler codebase (no premature abstraction)
- No risk of incorrect source labeling (single source = no ambiguity)

**Disadvantages:**
- When adding other review sources, we'll need a migration to add `review_source` column
- UI component will need refactor to handle multiple sources dynamically
- Temporary hardcode creates minor tech debt (flagged in DEV-331)

**Migration path when adding sources:**
1. Add `review_source ENUM('google', 'community', 'yelp', ...)` to shops table
2. Backfill existing rows with `'google'`
3. Update RatingBadge to accept `source` prop instead of hardcoding
4. Update scraper/persist layer to set source field
