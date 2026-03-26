# ADR: Scope DEV-20 to follow-only, defer broadcast to DEV-41

Date: 2026-03-26

## Decision

DEV-20 implements user-side follow/unfollow and follower counts only. Owner broadcast (compose + deliver announcements) is split into DEV-41, blocked by DEV-19 (shop claiming) and DEV-20.

## Context

The original DEV-20 ticket included both user following and owner broadcasting. However, the broadcast feature depends on shop claiming (DEV-19), which is out of V1 scope per PRD.md. Building broadcast without claiming infrastructure would require either a workaround (admin-triggered broadcasts) or pulling DEV-19 into V1.

## Alternatives Considered

- **Full feature (follow + broadcast):** Would extend V1 scope and require shop claiming infrastructure. Rejected: violates current PRD scope boundaries.
- **Follow + lightweight admin-triggered broadcast:** Admin sends on behalf of shops manually. Rejected: added complexity for a feature that has no audience yet (no claimed shops).

## Rationale

Follow-only delivers immediate user value (social proof, engagement signal, retention hook) without depending on unbuilt infrastructure. The `shop_followers` table becomes the foundation that DEV-41 builds on later. This phased approach matches CafeRoam's general strategy of building demand-side features first.

## Consequences

- Advantage: Stays within V1 scope, simpler implementation, no dependency on DEV-19
- Advantage: Builds the follower base that makes broadcast valuable when it launches
- Disadvantage: Users who follow shops won't receive any notifications until DEV-41 ships
