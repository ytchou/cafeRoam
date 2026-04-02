# ADR: ANON_SALT Rotation Plan

Date: 2026-04-02

## Decision
ANON_SALT should be rotated when compromised or on a 12-month cadence. Rotation resets all PostHog anonymous distinct_ids — this is acceptable for CafeRoam's analytics needs.

## Context
CafeRoam anonymizes user IDs before sending to PostHog via `SHA-256(ANON_SALT:user_id)`. If ANON_SALT is ever exposed, an attacker with access to PostHog data could re-identify users by re-computing the hash. Rotation mitigates this.

## Rotation Procedure
1. Generate a new random salt: `openssl rand -hex 32`
2. Update `ANON_SALT` in Railway backend service environment variables
3. Deploy the backend — all new events will use the new salt
4. PostHog: existing `distinct_id` history is preserved but disconnected from new events. This breaks user-level session continuity in PostHog analytics.

## Impact Assessment
- **Analytics continuity:** User timelines in PostHog break at rotation. Funnels and cohorts before/after rotation cannot be joined. Acceptable for CafeRoam: analytics are aggregate quality signals, not mission-critical user tracking.
- **No user-facing impact:** The anonymized ID is never shown to users or used in product features.
- **PDPA posture:** Rotation limits the window of re-identification risk to at most 12 months.

## Trigger Conditions
| Event | Action |
|-------|--------|
| ANON_SALT leaked or suspected compromised | Rotate immediately |
| Annual review (every 12 months) | Rotate as scheduled maintenance |
| Major architecture change affecting analytics | Evaluate and rotate if appropriate |

## Alternatives Considered
- **No rotation:** Simpler but leaves re-identification risk open indefinitely. Rejected.
- **Per-session salt:** Prevents any user-level analytics. Too aggressive for a product analytics use case. Rejected.
- **Tokenized IDs (reversible):** Allows re-identification by anyone with the mapping. Rejected — defeats the purpose.

## Rationale
Annual rotation with immediate rotation on compromise balances PDPA risk mitigation against analytics continuity cost. The 12-month window matches the typical audit cadence for Taiwan PDPA compliance.

## Consequences
- Advantage: limits re-identification risk to a bounded time window
- Disadvantage: PostHog user timelines break on rotation; must document in analytics runbook
- Operational note: update `scripts/doctor.sh` ANON_SALT check after each rotation to invalidate the old dev-default guard
