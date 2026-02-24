# Design: Python Backend Migration

Date: 2026-02-24

## Context

CafeRoam's SPEC defines a full-stack TypeScript monorepo. The backend (API routes, services, providers, workers) is currently stubbed in TypeScript with only interface definitions and 501-returning routes. The decision is to move all backend and worker code to Python (FastAPI), keeping TypeScript exclusively for the Next.js frontend and the existing prebuild data pipeline.

**Motivation:** Team familiarity with Python, access to the Python ecosystem (AI/ML libraries, data processing), and a clean separation of concerns between frontend (TypeScript) and backend (Python).

**Migration approach:** Clean break — build the Python backend from scratch using existing TypeScript stubs as requirements. No line-by-line porting.

---

## Architecture

### Monorepo Structure

```
caferoam/
├── app/                           # Next.js frontend (TypeScript)
│   ├── api/                       # Thin proxy routes → Python backend
│   ├── (pages)/                   # React pages + components
│   └── ...
├── backend/                       # Python backend (FastAPI)
│   ├── api/                       # FastAPI route handlers
│   │   ├── auth.py
│   │   ├── shops.py
│   │   ├── search.py
│   │   ├── checkins.py
│   │   ├── lists.py
│   │   └── stamps.py
│   ├── services/                  # Business logic
│   │   ├── search_service.py
│   │   ├── checkin_service.py
│   │   └── lists_service.py
│   ├── providers/                 # Provider abstractions (Protocol classes)
│   │   ├── llm/
│   │   │   ├── interface.py
│   │   │   ├── anthropic_adapter.py
│   │   │   └── __init__.py
│   │   ├── embeddings/
│   │   │   ├── interface.py
│   │   │   ├── openai_adapter.py
│   │   │   └── __init__.py
│   │   ├── email/
│   │   │   ├── interface.py
│   │   │   ├── resend_adapter.py
│   │   │   └── __init__.py
│   │   ├── analytics/
│   │   │   ├── interface.py
│   │   │   ├── posthog_adapter.py
│   │   │   └── __init__.py
│   │   └── maps/
│   │       ├── interface.py
│   │       ├── mapbox_adapter.py
│   │       └── __init__.py
│   ├── workers/                   # Background jobs
│   │   ├── scheduler.py           # APScheduler cron setup
│   │   ├── queue.py               # Postgres job queue consumer
│   │   └── handlers/
│   │       ├── enrich_shop.py
│   │       ├── generate_embedding.py
│   │       ├── enrich_menu_photo.py
│   │       ├── weekly_email.py
│   │       └── staleness_sweep.py
│   ├── models/                    # Pydantic models (domain types)
│   │   └── types.py
│   ├── core/                      # App config, shared utilities
│   │   └── config.py              # Pydantic Settings (env vars)
│   ├── db/                        # Supabase client setup
│   │   └── supabase_client.py
│   ├── main.py                    # FastAPI app entry point + lifespan
│   ├── pyproject.toml
│   └── Dockerfile
├── lib/                           # Frontend-only TypeScript
│   └── types/                     # Frontend type definitions
├── scripts/prebuild/              # Data pipeline (stays TypeScript)
└── railway.json                   # Two services: web + api
```

### Deployment Topology

Two Railway services from the same monorepo:

1. **web** — Next.js frontend (TypeScript). Serves pages + thin API proxy routes.
2. **api** — FastAPI backend (Python). Handles all business logic, auth validation, background workers.

Communication: Next.js proxy routes forward requests to the Python backend via Railway's internal network (~1ms latency, private URL, no public internet).

---

## Python Tech Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| Web framework | FastAPI >= 0.115 | Async-first, auto OpenAPI docs, Pydantic validation |
| ASGI server | uvicorn[standard] >= 0.34 | Production server for FastAPI |
| Database | supabase-py >= 2.0 | Supabase Python SDK, RLS works out of the box |
| Validation | Pydantic >= 2.0 | Data models + settings management |
| Config | pydantic-settings >= 2.0 | Env var configuration |
| LLM | anthropic >= 0.40 | Claude API for shop enrichment |
| Embeddings | openai >= 1.50 | text-embedding-3-small for vector search |
| Scheduler | APScheduler >= 3.10 | Replaces node-cron, runs within FastAPI process |
| Email | resend >= 2.0 | Transactional email |
| HTTP client | httpx >= 0.27 | Async HTTP for provider calls + test client |
| Error tracking | sentry-sdk[fastapi] >= 2.0 | Frontend + backend error tracking |
| Logging | structlog >= 24.0 | Structured JSON logging |
| Python version | >= 3.12 | Pattern matching, performance improvements |

### Dev Dependencies

| Tool | Purpose |
|------|---------|
| pytest >= 8.0 | Test runner |
| pytest-asyncio >= 0.24 | Async test support |
| pytest-cov >= 6.0 | Coverage reporting |
| ruff >= 0.8 | Linting + formatting (replaces ESLint + Prettier) |
| mypy >= 1.13 | Static type checking |

---

## Provider Abstraction Pattern

Same contract-first architecture, translated to idiomatic Python using `Protocol` classes:

```python
# backend/providers/llm/interface.py
from typing import Protocol

class LLMProvider(Protocol):
    async def enrich_shop(self, shop_data: dict) -> EnrichmentResult: ...

# backend/providers/llm/anthropic_adapter.py
class AnthropicLLMAdapter:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6-20250514"):
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def enrich_shop(self, shop_data: dict) -> EnrichmentResult:
        ...

# backend/providers/llm/__init__.py
def get_llm_provider() -> LLMProvider:
    match settings.llm_provider:
        case "anthropic":
            from .anthropic_adapter import AnthropicLLMAdapter
            return AnthropicLLMAdapter(api_key=settings.anthropic_api_key)
        case _:
            raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
```

Provider factory functions are wired via FastAPI's `Depends()` system — enables trivial test mocking via dependency override.

---

## API Layer & Proxy Pattern

### Python API Routes

FastAPI handles all business logic, auth validation, and database access:

```python
@router.get("/shops", response_model=list[ShopSummary])
async def list_shops(
    city: str | None = None,
    db: SupabaseClient = Depends(get_supabase),
): ...

@router.get("/search", response_model=list[SearchResult])
async def search(
    query: SearchQuery,
    search_svc: SearchService = Depends(get_search_service),
): ...
```

### Next.js Proxy Routes

Thin pass-throughs that forward auth headers:

```typescript
// app/api/shops/route.ts
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL;

export async function GET(request: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/shops${request.nextUrl.search}`, {
    headers: {
      Authorization: request.headers.get("Authorization") ?? "",
      "Content-Type": "application/json",
    },
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}
```

### Route Map

| Route | Method | Auth | Purpose |
|-------|--------|:----:|---------|
| `/shops` | GET | No | List/filter shops |
| `/shops/:id` | GET | No | Shop detail |
| `/search` | GET | Yes | Semantic search |
| `/checkins` | POST | Yes | Create check-in |
| `/checkins` | GET | Yes | User's check-ins |
| `/lists` | POST | Yes | Create list (3-cap enforced) |
| `/lists` | GET | Yes | User's lists |
| `/stamps` | GET | Yes | User's stamps |
| `/auth/callback` | POST | - | Auth callback |

### Auth Flow

1. Frontend sends Supabase JWT in `Authorization` header
2. Next.js proxy forwards header to Python backend
3. Python backend validates JWT via Supabase client
4. Supabase RLS policies enforce row-level access

---

## Workers & Job Queue

Workers run inside the FastAPI process via APScheduler + Postgres `job_queue` table (same schema as current design):

```python
# backend/workers/scheduler.py
scheduler = AsyncIOScheduler(timezone="Asia/Taipei")

# Cron triggers
scheduler.add_job(staleness_sweep, "cron", hour=3)
scheduler.add_job(weekly_email_digest, "cron", day_of_week="mon", hour=9)

# Job queue consumer (30-second polling)
scheduler.add_job(process_job_queue, "interval", seconds=30)
```

```python
# backend/workers/queue.py
class JobQueue:
    async def claim(self, job_type: str) -> Job | None: ...
    async def complete(self, job_id: str, result: dict) -> None: ...
    async def fail(self, job_id: str, error: str) -> None: ...
    async def enqueue(self, job_type: str, payload: dict) -> str: ...
```

Startup/shutdown via FastAPI lifespan:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

No changes to the Postgres `job_queue` table schema. Hybrid trigger model (cron + DB triggers) preserved.

---

## What Changes

### DELETE (TypeScript backend code)

- `lib/providers/` — all provider interfaces, adapters, factories
- `lib/services/` — all service interfaces
- `lib/db/supabase.ts` — server-side Supabase client
- `workers/` — queue, handlers, lib

### KEEP (TypeScript frontend + tooling)

- `app/` — Next.js pages + components (rewrite `app/api/` as thin proxies)
- `lib/types/` — frontend type definitions
- `scripts/prebuild/data-pipeline/` — all 6 passes stay TypeScript
- `scripts/ci/coverage-check.py` — already Python

### CREATE (Python backend)

- `backend/` — entire FastAPI application
- `backend/Dockerfile` — Python container for Railway
- `railway.json` — updated for two services (web + api)

### MODIFY

- `SPEC.md` — update tech stack, architecture, provider pattern, dev environment sections
- `CLAUDE.md` — update commands, tech stack reference
- `package.json` — remove backend-only TypeScript dependencies

---

## Testing Strategy

```
backend/tests/
├── conftest.py              # Shared fixtures (mock Supabase, mock providers)
├── api/
│   ├── test_shops.py
│   ├── test_search.py
│   ├── test_checkins.py
│   └── test_lists.py
├── services/
│   ├── test_search_service.py
│   ├── test_checkin_service.py
│   └── test_lists_service.py
├── providers/
│   └── test_provider_factories.py
└── workers/
    ├── test_queue.py
    └── test_handlers.py
```

- **pytest + pytest-asyncio** for async tests
- **FastAPI TestClient** (httpx-based) for API integration tests
- **Dependency override** (`app.dependency_overrides`) for mocking providers in tests
- Coverage thresholds: critical paths 80%+, services 70%+, overall 20%+
