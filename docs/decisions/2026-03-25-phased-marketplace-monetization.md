# ADR: Phased marketplace monetization — demand-side first, then supply-side

Date: 2026-03-25

## Decision

Monetize users (demand side) before shop owners (supply side), reversing the original PRD's "free for users, monetize supply side" model.

## Context

The original PRD (§8) specified free-for-users with supply-side monetization only (shop sponsored placements at NT$500-1K/month, Phase 2 at 6+ months). DEV-17 explored whether a paid user tier should exist and how it interacts with the auth wall, SEO, and supply-side timing.

The core question: should CafeRoam collect revenue from users, shop owners, or both — and in what order?

## Alternatives Considered

- **Supply-side only (original PRD model)**: Users free forever, shops pay for featured placement. Rejected: requires 1,000+ WAU before shops see value, leaving a 6+ month gap with zero revenue. Also delays learning about willingness-to-pay.
- **Demand-side only**: Users pay, shops never pay. Rejected: leaves the larger revenue opportunity (B2B) on the table. Shop owners are the higher-LTV segment.
- **Simultaneous launch**: Both user and shop tiers at launch. Rejected: too much complexity for a pre-PMF product. Split focus between B2C and B2B growth.

## Rationale

Phased approach (free → user membership → supply-side) matches the natural lifecycle of a marketplace:

1. **Phase 1 (free)** builds traffic and proves the product.
2. **Phase 2 (user membership)** generates early revenue from the demand side, which is easier to reach (lower sales effort than B2B). Validates willingness-to-pay. Revenue covers infrastructure costs.
3. **Phase 3 (supply-side)** becomes possible once demonstrated traffic gives shop owners a reason to pay.

This also de-risks the business: if supply-side monetization takes longer than expected, user membership revenue sustains operations.

## Consequences

- **Advantage**: Earlier revenue (month 2-3 vs month 6+). Revenue diversification. Lower break-even point (~25-40 paid members).
- **Advantage**: "Claim this page" badge from day 1 measures supply-side demand before building owner features.
- **Disadvantage**: Requires building feature gating infrastructure (daily caps, tier checks). Engineering cost.
- **Disadvantage**: PRD.md §8 (Monetization) needs rewriting — this is a significant product direction change.
- **Disadvantage**: Risk of user perception: "they promised free, now they're charging." Mitigated by generous free tier and Phase 1 being genuinely free.
