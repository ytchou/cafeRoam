# ADR: Dual storage for search observability (Postgres + PostHog)

Date: 2026-03-24

## Decision

Log search events to both a `search_events` Postgres table and PostHog `search_submitted` events.

## Context

DEV-9 needs to capture search queries and zero-result rates to inform search improvements (DEV-6 menu search, DEV-7 review indexing). The spec already defines a `search_submitted` PostHog event, and the PostHog analytics provider abstraction exists. The question was whether to use PostHog alone, a Postgres table alone, or both.

## Alternatives Considered

- **PostHog only**: Lowest effort — wire existing provider into search endpoint. Rejected: can't cross-join search queries with `shops` or `taxonomy_tags` tables to identify taxonomy coverage gaps. PostHog's query builder is too limited for the ad-hoc SQL analysis this feature is designed to enable. Also creates vendor lock-in on analytics data.
- **Postgres table only**: Full SQL flexibility and data ownership. Rejected: loses real-time dashboarding and alerting capabilities that PostHog provides out of the box. Would need to build custom dashboards.

## Rationale

The primary value of search observability is answering "what taxonomy gaps cause zero results?" — this requires SQL JOINs with shop and taxonomy data. PostHog can't do this. But PostHog is valuable for real-time monitoring (zero-result rate trends, alert on spikes). Both channels are lightweight to implement given existing infrastructure.

## Consequences

- Advantage: Full SQL flexibility for deep analysis + real-time PostHog dashboards
- Advantage: Data ownership — Postgres table is ours regardless of PostHog pricing changes
- Disadvantage: Two writes per search (mitigated by fire-and-forget async)
- Disadvantage: Must keep both channels in sync if event schema changes
