# ADR: Owner dashboard access requires role + per-shop claim check

Date: 2026-03-27

## Decision

`require_shop_owner` verifies **both** `user_roles.role = 'shop_owner'` AND an approved `shop_claims` row for the specific `shop_id`, not role alone.

## Context

A user could have the `shop_owner` role (assigned when any claim is approved) while attempting to access the dashboard for a *different* shop they don't own. Role-only checks would allow horizontal privilege escalation across shops.

## Alternatives Considered

- **Role-only check**: `user_roles.role = 'shop_owner'`. Rejected: doesn't scope access to the specific shop — any owner could read/edit any other claimed shop's dashboard.
- **Claim-only check**: query `shop_claims` without checking `user_roles`. Rejected: the role is the canonical authorization record; relying only on `shop_claims` bypasses the role system and could allow access even if the role was revoked.

## Rationale

Dual-check (role + claim) is the minimal, correct guard: the role establishes *that* the user is a shop owner in the system; the claim establishes *which* shop they own. Both must pass. This mirrors how `require_admin` checks `settings.admin_user_ids` rather than a role table — access is always scoped to a specific resource.

## Consequences

- Advantage: horizontal privilege escalation across shops is impossible even with a valid `shop_owner` role
- Advantage: revoking a claim (setting status ≠ 'approved') immediately revokes dashboard access without needing to change the role
- Disadvantage: two DB queries per protected request (mitigated by indexing `shop_claims(shop_id, user_id, status)`)
