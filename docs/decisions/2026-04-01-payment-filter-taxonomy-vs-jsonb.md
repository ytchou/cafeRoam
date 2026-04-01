# ADR: Find page payment filter uses taxonomy tags, not payment_methods JSONB

Date: 2026-04-01

## Decision

The Find page "Cash Only" and "Mobile Payment" filters use the existing taxonomy tag system (`cash_only`, `mobile_payment` tags on `shop_tags`) rather than querying the new `payment_methods` JSONB column.

## Context

DEV-90 adds a `payment_methods` JSONB column for structured, granular payment data. The Find page filter could use either taxonomy tags or JSONB to filter shops. A decision was needed to avoid duplicating filter logic.

## Alternatives Considered

- **Filter via `payment_methods` JSONB**: Filter shops where `payment_methods->>'cash' = 'true'`. More precise data source. Rejected for V1: the Find page filter runs client-side in `page.tsx` by matching `shop.taxonomyTags`; switching to JSONB-based filtering would require including `payment_methods` in the featured-shops fetch, adding a new filter type, and changing `page.tsx` logic — significant churn for a marginal accuracy gain at launch.

## Rationale

Taxonomy tags already power all other filters (WiFi, outlet, quiet). The LLM enrichment assigns `cash_only` from reviews and descriptions with reasonable recall for the filter use case. Wiring two new entries in `filter-map.ts` is a one-line change that unblocks the filter without any backend changes. The JSONB column serves the shop detail section (precision, community data) while taxonomy tags serve the filter (recall, existing infrastructure).

## Consequences

- Advantage: Zero backend changes to enable the filter — purely frontend `filter-map.ts` update
- Advantage: Consistent with all other filter types in the app
- Disadvantage: Filter accuracy limited to LLM enrichment recall for `cash_only`/`mobile_payment` tags; shops with `payment_methods.cash = true` but no taxonomy tag will not appear in filter results
- Disadvantage: May need revisiting post-Beta if community payment data grows large enough to justify JSONB-based filtering
