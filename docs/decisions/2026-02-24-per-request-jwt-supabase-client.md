# ADR: Per-Request JWT Supabase Client for User-Facing Routes

Date: 2026-02-24

## Decision
User-facing API routes create a per-request Supabase client authenticated with the user's JWT token, enabling RLS enforcement via `auth.uid()`.

## Context
The Python backend migration initially used a singleton Supabase client with the anon key. This bypassed RLS policies defined in the DB infrastructure design (`lists: auth.uid() = user_id`, `list_items: parent list ownership`, etc.). Combined with missing application-level ownership checks, this created authorization bypass vulnerabilities.

## Alternatives Considered
- **Service role client + app-level checks**: Use service role everywhere, add explicit ownership verification in every service method. Rejected: more code surface to audit, higher risk of missing a check, contradicts the design doc's stated RLS approach.
- **Hybrid: JWT client + redundant app checks**: Defense-in-depth with both RLS and application checks. Rejected: unnecessary complexity for V1 — RLS is the designed enforcement layer, and redundant checks add maintenance burden without meaningful security gain when RLS is correctly configured.

## Rationale
- Matches the design doc (line 211-216): "Supabase RLS policies enforce row-level access"
- Matches the DB infrastructure design's RLS policy definitions
- Minimal application code — ownership enforcement is declarative in Postgres
- Workers continue using service role client (correct for job queue, enrichment)

## Consequences
- Advantage: Authorization is enforced at the database layer — impossible to bypass from application code
- Advantage: Simpler service methods — no ownership check boilerplate
- Disadvantage: Per-request client creation has slight overhead vs singleton (mitigated by Supabase's connection pooling)
- Disadvantage: Must ensure JWT is forwarded correctly through the proxy chain
