# ADR: User Roles via Join Table

Date: 2026-03-18

## Decision

Store user roles in a `user_roles` join table supporting multiple concurrent roles per user, rather than a single-role column on `profiles` or Supabase `app_metadata`.

## Context

Community Notes requires identifying partner/blogger users to surface their check-in reviews. The project also anticipates future role types (`paid_user`, `partner`, `admin`) and needs a role system that supports users holding multiple roles simultaneously (e.g., a blogger who is also a paid user).

## Alternatives Considered

- **`role` column on `profiles` table**: Simpler (single column, no joins), but can only represent one role per user. Would require a role hierarchy to handle "blogger who is also a paid user" — fragile as roles grow.

- **Supabase `app_metadata`**: Role appears in JWT automatically (no DB query needed). But requires Supabase admin API to grant/revoke, making it harder to manage via the app's admin dashboard. Also not queryable via standard SQL joins for feed queries.

## Rationale

A join table is the right fit because:
1. **Multiple concurrent roles** — a user can be `blogger` + `paid_user` without conflict
2. **SQL-queryable** — community feed queries can `JOIN user_roles` directly, no JWT parsing
3. **Audit trail** — `granted_at` + `granted_by` columns track who granted each role and when
4. **Admin-manageable** — standard CRUD via admin API, no Supabase admin SDK dependency
5. **PDPA compliant** — `ON DELETE CASCADE` from `auth.users` ensures cleanup on account deletion

## Consequences

- Advantage: Flexible multi-role system that scales to future role types without schema changes
- Advantage: Built-in audit trail for role grants
- Disadvantage: Requires a JOIN in community feed queries (minor perf cost, mitigated by index on `user_id`)
- Disadvantage: Role checks require a DB query (unlike `app_metadata` which is in the JWT). Acceptable for the current scale.
