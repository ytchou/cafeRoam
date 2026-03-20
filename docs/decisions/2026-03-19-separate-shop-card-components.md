# ADR: Use separate ShopCard components instead of polymorphic variant

Date: 2026-03-19

## Decision

Create three distinct shop card components — ShopCardCarousel, ShopCardCompact, and ShopCardGrid — instead of a single polymorphic ShopCard with variant prop.

## Context

The Map View feature has three card layouts for displaying coffee shops: a vertical carousel card (mobile map), a horizontal row card (mobile list + desktop panel), and a large photo grid card (desktop list). All share the same shop data but differ significantly in DOM structure, sizing, and visual treatment.

## Alternatives Considered

- **Single polymorphic ShopCard with `variant` prop**: One component with `variant='carousel' | 'compact' | 'grid'`. Rejected: The three layouts share almost no DOM structure — carousel is vertical (image top, content below), compact is horizontal (thumbnail left, info center, arrow right), grid is vertical with larger proportions. A polymorphic component would be a large if/else tree with no actual code reuse. Harder to maintain and reason about.

## Rationale

The three card types share a data interface (Shop type) but not a UI structure. Code reuse happens at the data layer (shared props type, shared hooks) not the component layer. Separate components are each ~30-50 lines, focused, easy to style independently, and won't break each other during changes. The shared `Shop` TypeScript type provides the data contract; the rendering is intentionally different per context.

## Consequences

- Advantage: Each card component is small, focused, easy to understand
- Advantage: Changes to one card layout can't accidentally break another
- Advantage: Easier to add context-specific features (e.g., selected state only on ShopCardCompact)
- Disadvantage: Some visual details (star rating, tag chips) may be duplicated — can extract tiny sub-components if this becomes painful
