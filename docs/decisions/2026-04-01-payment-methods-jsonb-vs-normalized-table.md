# ADR: payment_methods stored as JSONB on shops table

Date: 2026-04-01

## Decision

Store payment method booleans (`cash`, `card`, `line_pay`, `twqr`, `apple_pay`, `google_pay`) as a JSONB column on the `shops` table, with a separate `shop_payment_confirmations` table for community votes.

## Context

DEV-90 adds structured payment method data to shops. Two data model options were considered for storing which payment methods a shop accepts.

## Alternatives Considered

- **Separate `shop_payment_methods` table**: One row per method per shop (shop_id, method, value, source, confirmed_count). Normalized, easy to add new methods without schema changes. Rejected: requires joins for every shop fetch; the payload is a fixed small set of boolean flags, which is idiomatic for JSONB; confirmation counts belong in the community table anyway.

## Rationale

Payment methods are a fixed, small enum (6 values) with boolean semantics. JSONB on the `shops` row means zero extra joins at read time and fits the existing enrichment update pattern (`db.table("shops").update({...})`). Community confirmations are kept in a separate table (`shop_payment_confirmations`) to support per-user upsert and confirmation counting — append semantics are not a fit for JSONB.

## Consequences

- Advantage: Simple reads — payment data is in the shop row, no join required
- Advantage: Consistent with how `menu_highlights`, `coffee_origins`, and other structured enrichment data is stored
- Disadvantage: Adding a new payment method type requires a schema or convention doc update (though no migration for JSONB columns themselves)
- Disadvantage: Querying "all shops that accept LINE Pay" requires `payment_methods->>'line_pay' = 'true'` style JSONB operators instead of a simple `WHERE method = 'line_pay'`
