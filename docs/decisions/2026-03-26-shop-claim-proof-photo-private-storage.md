# ADR: Proof photos stored in private Supabase Storage bucket

Date: 2026-03-26

## Decision

Store shop claim proof photos in a private Supabase Storage bucket (`claim-proofs`), accessible only via service-role-generated signed URLs. Admins view proof photos through a backend endpoint that generates signed URLs on demand.

## Context

The claim form requires a proof photo (business card, photo at the shop, Google Business screenshot) to verify ownership. These photos often contain personal information (owner's face, personal business card details). Under PDPA, personal data must not be publicly accessible.

## Alternatives Considered

- **Public bucket with obfuscated path**: Simpler RLS, but proof photos (business cards, personal photos) would be reachable if the URL is guessed or leaked. PDPA risk — rejected.
- **Email attachment only (no DB storage)**: Admin receives proof photo via email on claim submission. Simpler (no bucket setup), but no persistent record for re-review, no audit trail, and email attachments aren't searchable in the admin UI. Rejected for auditability.

## Rationale

Private bucket with signed URLs is the correct PDPA-safe approach. Consistent with how Supabase Storage is already used for check-in photos (private access patterns). Signed URLs are short-lived (1 hour) and generated only when admin is actively reviewing a claim.

## Consequences

- Advantage: PDPA compliant — proof photos never publicly accessible
- Advantage: Audit trail — proof photos persisted and linked to claim record
- Disadvantage: Requires backend endpoint to generate signed URL for admin view (minor extra endpoint vs. direct public URL)
