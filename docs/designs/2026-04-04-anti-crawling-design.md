# Anti-Crawling Core Protection — Design Doc

**Ticket:** DEV-210
**Date:** 2026-04-04
**Status:** Approved

## Problem

CafeRoam's enriched shop data (taxonomy tags, mode scores, vibe descriptions) is the core competitive asset (PRD §5). All public endpoints (`/shops/`, `/shops/{id}`, `/explore/*`, `/feed`, `/maps/directions`) have zero rate limiting and zero bot detection. A scraper can enumerate the entire shop database trivially with a simple loop.

The semantic search endpoint (`/search`) requires auth but has no rate limit — a compromised or free account can hammer the OpenAI embeddings API (cost exposure). The maps proxy (`/maps/directions`) forwards to Mapbox with no auth or rate limit.

## Scope

**In scope (this ticket):**

- Rate limiting on all API routes (per-IP default + route-specific overrides)
- Bot detection middleware (UA screening + missing browser header heuristic)
- Structured alerting (structlog events + Sentry breadcrumbs)

**Out of scope (DEV-223 hardening ticket):**

- Honeypot endpoints
- Response poisoning for suspected bots
- Cloudflare WAF / CDN
- Redis-backed rate limit state
- Request cadence analysis (behavioral patterns)
- IP reputation databases
- CAPTCHA / JS challenges

## Architecture

Three application-level layers, all in the Python FastAPI backend:

### 1. BotDetectionMiddleware

New `BotDetectionMiddleware` (Starlette `BaseHTTPMiddleware`) — runs outermost in the middleware chain, rejects bots before rate limiting or request ID assignment.

**Classification logic:**
| Verdict | Condition | Action |
|---------|-----------|--------|
| `blocked` | Empty UA or blocklist UA match (curl, scrapy, python-requests, wget, Go-http-client, etc.) | 403 Forbidden |
| `ok` | Allowlist match (Googlebot, Bingbot, DuckDuckBot, etc.) | Pass through |
| `suspicious` | 2+ missing browser headers (Accept, Accept-Language, Accept-Encoding) | Pass through + `X-Bot-Suspect: 1` header |
| `ok` | Everything else | Pass through |

- Health endpoints (`/health`, `/health/deep`) exempt
- Killswitch: `BOT_DETECTION_ENABLED=false` env var
- UA blocklist and allowlist are env-configurable lists

### 2. Rate Limiting

Extends existing slowapi `Limiter` with:

- `default_limits=["60/minute"]` as global safety net (all routes)
- Route-specific overrides:

| Route                  | Limit   | Key                          |
| ---------------------- | ------- | ---------------------------- |
| `GET /search`          | 10/min  | Per user (JWT `sub` claim)   |
| `GET /maps/directions` | 30/min  | Per IP                       |
| `GET /shops/` (list)   | 30/min  | Per IP                       |
| All other routes       | 60/min  | Per IP (default)             |
| Health endpoints       | Exempt  | —                            |
| `POST /submissions`    | 10/hour | Per IP (existing, unchanged) |

**Per-user key function:** `get_user_id_or_ip` extracts the JWT `sub` claim via unverified decode (rate limiting only needs a stable key; auth verification happens in the dependency chain). Falls back to IP for unauthenticated requests.

**State:** In-memory (slowapi default). Resets on deploy. Acceptable for single Railway instance; upgrade to Redis in DEV-223.

### 3. Alerting

- Bot blocks: `logger.warning("bot_blocked", event_type="bot_detection", ...)` + Sentry breadcrumb
- Suspicious flags: `logger.info("bot_suspicious", event_type="bot_detection", ...)` + Sentry breadcrumb
- Rate limit exceeded: custom 429 handler with `logger.warning("rate_limit_exceeded", event_type="rate_limit", ...)` + Sentry breadcrumb

All events include: `ip`, `path`, `method`, `user_agent` (truncated to 200 chars), `event_type`. The `event_type` field enables PostHog filtering.

## Config

All added to `backend/core/config.py` (Pydantic Settings, env-configurable):

```python
rate_limit_default: str = "60/minute"
rate_limit_search: str = "10/minute"
rate_limit_maps_directions: str = "30/minute"
rate_limit_shops_list: str = "30/minute"
bot_detection_enabled: bool = True
bot_ua_blocklist: list[str] = [...]  # 14 known scraper UA substrings
bot_ua_allowlist: list[str] = [...]  # 7 legitimate crawler UA substrings
```

## Middleware Chain Order

After registration (last added = outermost in Starlette):

1. **BotDetectionMiddleware** (outermost — blocks bots first)
2. **RequestIDMiddleware** (assigns request ID, logs request)
3. **slowapi rate limiting** (implicit via `app.state.limiter`)

## Files Changed

| File                                             | Change                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `backend/core/config.py`                         | Add 7 config fields                                        |
| `backend/middleware/rate_limit.py`               | Add `default_limits`, `get_user_id_or_ip`                  |
| `backend/middleware/bot_detection.py`            | **New** — BotDetectionMiddleware                           |
| `backend/main.py`                                | Register bot middleware, custom 429 handler, exempt health |
| `backend/api/search.py`                          | `@limiter.limit()` + `Request` param                       |
| `backend/api/maps.py`                            | `@limiter.limit()` + `Request` param                       |
| `backend/api/shops.py`                           | `@limiter.limit()` on list endpoint + `Request` param      |
| `backend/api/health.py`                          | `@limiter.exempt` on admin health endpoints                |
| `backend/tests/middleware/test_bot_detection.py` | **New** — 13 test cases                                    |
| `backend/tests/middleware/test_rate_limiting.py` | **New** — 5 test cases                                     |

## Testing Classification

- [ ] **New e2e journey?** No — no new critical user path
- [x] **Coverage gate impact?** Yes — verify 80% coverage on `middleware/bot_detection.py` and `middleware/rate_limit.py`

## Alternatives Rejected

- **Full system in one ticket** (honeypots + response poisoning + Cloudflare): Too large for Beta timeline. Core protection covers the highest-risk gaps.
- **Postgres-backed rate limits**: Adds DB load on every request; unusual pattern for rate limiting.
- **Next.js middleware detection**: Splits security logic across two codebases; violates architecture principle of keeping business logic in Python.
- **Redis state store**: Adds $5-10/mo infra cost and a new dependency. Overkill for single-instance Beta.
- **Aggressive rate limits (20/min)**: Risk of false positives on shared WiFi networks (e.g., cafe networks with multiple users behind one IP).
