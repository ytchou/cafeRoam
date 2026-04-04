# ADR: Application-level anti-crawling over Cloudflare WAF for Beta

Date: 2026-04-04

## Decision

Implement rate limiting and bot detection as Python FastAPI middleware rather than adding Cloudflare WAF at the infrastructure level.

## Context

CafeRoam's enriched shop data is served via public API endpoints with zero rate limiting or bot detection. Before Beta launch, we need to prevent mass scraping. Two viable approaches: application-level middleware (code-only) or Cloudflare WAF (infrastructure change).

## Alternatives Considered

- **Cloudflare WAF + Bot Management**: Edge-level protection with DDoS mitigation, managed rulesets, and JS challenges. Rejected: requires DNS migration, adds operational complexity, and introduces infrastructure risk before Beta. Deferred to DEV-223.
- **Redis-backed rate limits**: Persistent, shared state across instances. Rejected: adds $5-10/mo cost and a new dependency for a single-instance deployment. In-memory state is sufficient for Beta.
- **Next.js middleware detection**: Defense-in-depth at both layers. Rejected: splits security logic across TypeScript and Python codebases, violating the architecture principle of keeping business logic in Python backend.

## Rationale

Application-level middleware (slowapi rate limits + BotDetectionMiddleware) is the right fit because: (1) zero infrastructure changes needed — code-only deployment on existing Railway setup, (2) env-configurable thresholds allow tuning without redeployment, (3) CafeRoam runs a single Railway instance making in-memory state acceptable, (4) the approach is incrementally upgradeable to Cloudflare + Redis later without architectural changes.

## Consequences

- Advantage: Ships immediately with no infrastructure risk; all config is env-tunable
- Advantage: Killswitch (`BOT_DETECTION_ENABLED=false`) for quick rollback
- Disadvantage: In-memory rate limit state resets on deploy (brief unprotected window)
- Disadvantage: No DDoS protection at the network level — a volumetric attack would still reach the application
- Disadvantage: Sophisticated scrapers with rotating IPs and browser-like headers can still scrape slowly
