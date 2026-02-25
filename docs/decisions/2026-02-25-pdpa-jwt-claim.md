# ADR: Custom JWT Claim for PDPA Consent Status

Date: 2026-02-25

## Decision

Embed PDPA consent status (`pdpa_consented: boolean`) as a custom claim in the Supabase JWT, injected via a PostgreSQL Auth hook, rather than querying the backend on each request.

## Context

The Next.js middleware must check PDPA consent status on every protected route navigation to redirect unconsented users to `/onboarding/consent`. Two approaches exist for getting this status.

## Alternatives Considered

- **Backend API call per request**: Middleware calls `GET /auth/me` on the Python backend for each navigation to check `pdpa_consent_at`. Rejected: Adds a network round-trip on every page load, increasing latency and coupling frontend middleware to backend availability. At scale this is a bottleneck; even at small scale it degrades perceived performance.

## Rationale

Supabase supports custom JWT claims via PostgreSQL Auth hooks — a function that fires when a JWT is minted, adding arbitrary claims from the database. Setting `pdpa_consented: true/false` as a claim means the middleware can read it directly from the session token with zero network calls. The claim is refreshed automatically when the session token refreshes (typically every hour), which is sufficient — consent is not revoked frequently.

## Consequences

- Advantage: Zero extra network calls in middleware — consent check is local to the session token
- Advantage: No coupling between Next.js middleware and Python backend availability
- Advantage: Works even if Python backend is briefly unavailable
- Disadvantage: Requires a Supabase PostgreSQL Auth hook function (additional DB migration)
- Disadvantage: Consent status in the JWT lags reality by up to the token TTL (1 hour) — acceptable since consent changes rarely
- Disadvantage: Custom claims are a Supabase-specific feature; migrating off Supabase Auth would require revisiting this
