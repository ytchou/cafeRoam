# ADR: 30-Day Soft Delete with Grace Period for Account Deletion

Date: 2026-02-25

## Decision

Account deletion uses a 30-day soft delete (set `deletion_requested_at`, disable access, hard delete after 30 days) rather than immediate hard delete.

## Context

Taiwan PDPA requires that user data be deleted upon request within 30 days. The design must choose between immediate deletion and a deferred model with a grace period.

## Alternatives Considered

- **Immediate hard delete**: User confirms → all DB rows deleted via CASCADE → Storage objects deleted asynchronously. Rejected: Accidental deletions cannot be recovered; support burden is high for a solo-dev product.

- **Immediate soft delete + async cleanup**: Mark account disabled immediately, run cleanup job in background. Rejected: This provides no recovery window and is not meaningfully simpler than the 30-day model given the scheduled job is required either way.

## Rationale

Taiwan PDPA permits up to 30 days for deletion completion, making a grace period legally valid. A 30-day window dramatically reduces support burden from accidental deletions — users can log back in and cancel within the window. The APScheduler infrastructure already exists in the backend, making a daily cleanup job low incremental cost. The `deletion_requested_at` timestamp provides a clear audit trail.

## Consequences

- Advantage: Users can recover from accidental deletions within 30 days
- Advantage: Satisfies PDPA 30-day requirement while being user-friendly
- Advantage: Leverages existing APScheduler infrastructure
- Disadvantage: Requires `deletion_requested_at` column on `profiles` + scheduler job
- Disadvantage: Middleware must handle the "pending deletion" state (detect and redirect to recovery page)
- Disadvantage: Supabase Auth user remains active during grace period — middleware must block protected route access
