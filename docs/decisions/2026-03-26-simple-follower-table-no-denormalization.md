# ADR: Simple follower table with COUNT(*) over denormalized counts

Date: 2026-03-26

## Decision

Use a simple `shop_followers` junction table with `COUNT(*)` aggregate queries for follower counts. No denormalized `follower_count` column on the `shops` table.

## Context

Follower counts need to be displayed on shop detail pages (with a 10+ visibility threshold). Three approaches were considered for how to compute and serve these counts.

## Alternatives Considered

- **Denormalized count column + Postgres trigger:** Add `follower_count INT` to `shops` table, maintained by INSERT/DELETE triggers on `shop_followers`. Rejected: premature optimization — adds migration complexity and a trigger to maintain for 164 shops with early-stage user counts.
- **Event-sourced follows:** Store follow/unfollow events in a log table, derive current state from events. Rejected: massively overengineered for current needs. No analytics requirement justifies the complexity.

## Rationale

CafeRoam has 164 shops and is in early launch. A `COUNT(*)` query on an indexed column is trivially fast at this scale (sub-millisecond). Adding denormalization or event sourcing adds complexity with zero measurable performance benefit. If follower counts become a bottleneck (thousands of followers per shop), adding a denormalized column is a straightforward migration that doesn't require schema changes to `shop_followers`.

## Consequences

- Advantage: Simplest possible implementation, fewer moving parts, easier to test
- Advantage: No trigger maintenance, no eventual consistency concerns
- Disadvantage: COUNT(*) queries scale linearly with followers per shop — acceptable for years at projected growth
