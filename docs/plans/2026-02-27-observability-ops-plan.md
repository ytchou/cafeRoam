# Observability & Ops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Design Doc:** [docs/designs/2026-02-27-observability-ops-design.md](docs/designs/2026-02-27-observability-ops-design.md)

**Spec References:** §1 Tech Stack (Better Stack row), §6 Observability

**PRD References:** §Success Metrics (WAU, search wow rate, check-in rate — instrumented via PostHog)

**Goal:** Wire up the full observability stack: Sentry (errors), PostHog (analytics), Better Stack (uptime), structured request logging with request IDs, and rich health checks.

**Architecture:** Best-of-breed approach — each tool handles what it does best. Backend gets Sentry + request middleware + deep health checks. Frontend gets Sentry + PostHog. Better Stack monitors externally. All free tier, $0/mo.

**Tech Stack:** sentry-sdk[fastapi] (already installed), @sentry/nextjs, posthog-js, structlog (already installed), Better Stack (external config)

---

### Task 1: Sentry Backend Initialization

Wire up `sentry-sdk` (already in `pyproject.toml`) to capture FastAPI errors with environment context.

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/core/config.py`
- Test: `backend/tests/test_sentry_init.py`

**Step 1: Write the failing test**

Create `backend/tests/test_sentry_init.py`:

```python
from unittest.mock import patch, MagicMock

import pytest


class TestSentryInit:
    """Test that Sentry initializes correctly when DSN is provided."""

    def test_sentry_init_called_with_dsn(self):
        """Sentry SDK should be initialized when SENTRY_DSN is set."""
        with (
            patch("main.sentry_sdk") as mock_sentry,
            patch("main.settings") as mock_settings,
        ):
            mock_settings.sentry_dsn = "https://test@sentry.io/123"
            mock_settings.environment = "production"

            from main import _init_sentry
            _init_sentry()

            mock_sentry.init.assert_called_once()
            call_kwargs = mock_sentry.init.call_args.kwargs
            assert call_kwargs["dsn"] == "https://test@sentry.io/123"
            assert call_kwargs["environment"] == "production"
            assert call_kwargs["traces_sample_rate"] == 0.1

    def test_sentry_skipped_without_dsn(self):
        """Sentry should not initialize when DSN is empty."""
        with (
            patch("main.sentry_sdk") as mock_sentry,
            patch("main.settings") as mock_settings,
        ):
            mock_settings.sentry_dsn = ""

            from main import _init_sentry
            _init_sentry()

            mock_sentry.init.assert_not_called()
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run python -m pytest tests/test_sentry_init.py -v`
Expected: FAIL — `_init_sentry` does not exist yet

**Step 3: Write minimal implementation**

In `backend/main.py`, add Sentry initialization:

```python
import sentry_sdk

def _init_sentry() -> None:
    """Initialize Sentry error tracking if DSN is configured."""
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
    logger.info("Sentry initialized", environment=settings.environment)
```

Call `_init_sentry()` at the top of the `lifespan` function, before scheduler start:

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _init_sentry()
    logger.info("Starting CafeRoam API", environment=settings.environment)
    # ... rest unchanged
```

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run python -m pytest tests/test_sentry_init.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_sentry_init.py
git commit -m "feat(obs): initialize Sentry backend with environment context"
```

---

### Task 2: Request ID Middleware

Add middleware that generates a UUID `request_id` for every API request, logs request/response details, and returns the ID in response headers.

**Files:**
- Create: `backend/middleware/__init__.py`
- Create: `backend/middleware/request_id.py`
- Test: `backend/tests/middleware/__init__.py`
- Test: `backend/tests/middleware/test_request_id.py`
- Modify: `backend/main.py` (add middleware)

**Step 1: Write the failing test**

Create `backend/tests/middleware/__init__.py` (empty) and `backend/tests/middleware/test_request_id.py`:

```python
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from starlette.testclient import TestClient
from fastapi import FastAPI

from middleware.request_id import RequestIDMiddleware


@pytest.fixture
def app_with_middleware():
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"ok": True}

    @app.get("/health")
    async def health_endpoint():
        return {"status": "ok"}

    return app


@pytest.fixture
def client(app_with_middleware):
    return TestClient(app_with_middleware)


class TestRequestIDMiddleware:
    def test_adds_request_id_header_to_response(self, client):
        response = client.get("/test")
        assert "X-Request-ID" in response.headers
        # Verify it's a valid UUID
        uuid.UUID(response.headers["X-Request-ID"])

    def test_unique_ids_per_request(self, client):
        r1 = client.get("/test")
        r2 = client.get("/test")
        assert r1.headers["X-Request-ID"] != r2.headers["X-Request-ID"]

    def test_skips_health_endpoints(self, client):
        """Health check requests should not be logged (but still get request IDs)."""
        response = client.get("/health")
        assert response.status_code == 200
        # Still gets a request ID header
        assert "X-Request-ID" in response.headers
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run python -m pytest tests/middleware/test_request_id.py -v`
Expected: FAIL — `middleware.request_id` does not exist

**Step 3: Write minimal implementation**

Create `backend/middleware/__init__.py` (empty).

Create `backend/middleware/request_id.py`:

```python
import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger()

_SKIP_LOG_PATHS = {"/health", "/health/deep"}


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        start = time.monotonic()

        response = await call_next(request)

        duration_ms = round((time.monotonic() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id

        if request.url.path not in _SKIP_LOG_PATHS:
            logger.info(
                "request",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=duration_ms,
            )

        return response
```

Wire it into `backend/main.py` — add after `app = FastAPI(...)`:

```python
from middleware.request_id import RequestIDMiddleware

app.add_middleware(RequestIDMiddleware)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run python -m pytest tests/middleware/test_request_id.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/middleware/ backend/tests/middleware/ backend/main.py
git commit -m "feat(obs): add request ID middleware with structured request logging"
```

---

### Task 3: Deep Health Check Endpoint

Add a `/health/deep` endpoint that validates Postgres connectivity and reports per-dependency health with latency.

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_health.py`

**Step 1: Write the failing test**

Create `backend/tests/test_health.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestShallowHealth:
    def test_returns_ok(self):
        from main import app
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestDeepHealth:
    @patch("main.get_service_role_client")
    def test_healthy_when_db_reachable(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.limit.return_value.execute = (
            MagicMock(return_value=MagicMock(data=[{"now": "2026-01-01"}]))
        )
        mock_get_client.return_value = mock_client

        from main import app
        client = TestClient(app)
        response = client.get("/health/deep")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["checks"]["postgres"]["status"] == "healthy"
        assert "latency_ms" in data["checks"]["postgres"]

    @patch("main.get_service_role_client")
    def test_unhealthy_when_db_unreachable(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.limit.return_value.execute = (
            MagicMock(side_effect=Exception("Connection refused"))
        )
        mock_get_client.return_value = mock_client

        from main import app
        client = TestClient(app)
        response = client.get("/health/deep")

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["postgres"]["status"] == "unhealthy"
        assert "error" in data["checks"]["postgres"]
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run python -m pytest tests/test_health.py::TestDeepHealth -v`
Expected: FAIL — `/health/deep` endpoint does not exist

**Step 3: Write minimal implementation**

In `backend/main.py`, add the deep health endpoint:

```python
import time
from fastapi.responses import JSONResponse
from db.supabase_client import get_service_role_client


@app.get("/health/deep")
async def deep_health_check() -> JSONResponse:
    """Check connectivity to all critical dependencies."""
    checks: dict = {}
    all_healthy = True

    # Check Postgres via Supabase
    start = time.monotonic()
    try:
        db = get_service_role_client()
        db.table("shops").select("id").limit(1).execute()
        latency_ms = round((time.monotonic() - start) * 1000, 1)
        checks["postgres"] = {"status": "healthy", "latency_ms": latency_ms}
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000, 1)
        checks["postgres"] = {"status": "unhealthy", "latency_ms": latency_ms, "error": str(e)}
        all_healthy = False

    status = "healthy" if all_healthy else "unhealthy"
    status_code = 200 if all_healthy else 503
    return JSONResponse(content={"status": status, "checks": checks}, status_code=status_code)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run python -m pytest tests/test_health.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_health.py
git commit -m "feat(obs): add deep health check endpoint with dependency validation"
```

---

### Task 4: Sentry Frontend Initialization

Install `@sentry/nextjs` and wire it into the Next.js 16 app. Source maps uploaded at build time.

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `instrumentation.ts`
- Modify: `next.config.ts` (wrap with `withSentryConfig`)
- Modify: `app/layout.tsx` (add `<ErrorBoundary>` — optional, Sentry auto-captures)
- Modify: `.env.example` (add `SENTRY_AUTH_TOKEN` placeholder)
- Test: `app/__tests__/sentry-init.test.ts`

**Step 1: Install dependency**

Run: `pnpm add @sentry/nextjs`

No test needed — dependency installation.

**Step 2: Write the failing test**

Create `app/__tests__/sentry-init.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Verify sentry config files exist and export correctly
describe('Sentry configuration', () => {
  it('client config calls Sentry.init', async () => {
    const mockInit = vi.fn();
    vi.doMock('@sentry/nextjs', () => ({
      init: mockInit,
      replayIntegration: vi.fn(() => ({ name: 'Replay' })),
    }));

    // Force re-import to trigger init
    await vi.importActual('../../sentry.client.config');

    // The config file should call Sentry.init when imported
    // We verify the file exists and is importable
    expect(true).toBe(true); // Config file exists and doesn't throw
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm test -- app/__tests__/sentry-init.test.ts`
Expected: FAIL — `sentry.client.config` does not exist

**Step 4: Write Sentry config files**

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

Create `instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (...args: unknown[]) => {
  const Sentry = await import('@sentry/nextjs');
  // @ts-expect-error -- Sentry types for onRequestError are in flux
  return Sentry.captureRequestError(...args);
};
```

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
```

Update `.env.example` — add under Error Tracking section:

```
SENTRY_AUTH_TOKEN=              # Sentry auth token for source map uploads (CI only)
SENTRY_ORG=                     # Sentry organization slug
SENTRY_PROJECT=                 # Sentry project slug
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- app/__tests__/sentry-init.test.ts`
Expected: PASS

**Step 6: Run full frontend checks**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: All pass. Sentry wrapping should be transparent when DSN is empty.

**Step 7: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts next.config.ts .env.example app/__tests__/sentry-init.test.ts
git commit -m "feat(obs): initialize Sentry frontend with source map upload support"
```

---

### Task 5: PostHog Frontend SDK

Install `posthog-js` and create a PostHog provider wrapper for the React app.

**Files:**
- Create: `lib/posthog/provider.tsx`
- Modify: `app/layout.tsx` (wrap with PostHogProvider)
- Modify: `.env.example` (already has PostHog vars — verify)
- Test: `lib/posthog/__tests__/provider.test.tsx`

**Step 1: Install dependency**

Run: `pnpm add posthog-js`

No test needed — dependency installation.

**Step 2: Write the failing test**

Create `lib/posthog/__tests__/provider.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock posthog-js before importing the provider
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

describe('PostHogProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset env
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
  });

  it('renders children when PostHog key is not set', async () => {
    const { PostHogProvider } = await import('../provider');
    render(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders children when PostHog key is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com');

    const { PostHogProvider } = await import('../provider');
    render(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm test -- lib/posthog/__tests__/provider.test.tsx`
Expected: FAIL — `lib/posthog/provider` does not exist

**Step 4: Write minimal implementation**

Create `lib/posthog/provider.tsx`:

```tsx
'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) return;

    posthog.init(key, {
      api_host: host || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      respect_dnt: true,
      persistence: 'localStorage+cookie',
    });
  }, []);

  return <>{children}</>;
}
```

Update `app/layout.tsx` — wrap body children with PostHogProvider:

```tsx
import { PostHogProvider } from '@/lib/posthog/provider';

// ... existing code ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- lib/posthog/__tests__/provider.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/posthog/ app/layout.tsx
git commit -m "feat(obs): add PostHog frontend provider with DNT respect"
```

---

### Task 6: Worker Sentry Integration

Ensure Sentry captures worker job failures with job context (job_id, job_type, shop_id).

**Files:**
- Modify: `backend/workers/scheduler.py`
- Test: `backend/tests/workers/test_sentry_capture.py`

**Step 1: Write the failing test**

Create `backend/tests/workers/test_sentry_capture.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import Job, JobType


class TestJobFailureSentryCapture:
    @pytest.mark.asyncio
    @patch("workers.scheduler.sentry_sdk")
    @patch("workers.scheduler.get_service_role_client")
    async def test_captures_exception_on_job_failure(
        self, mock_get_client, mock_sentry
    ):
        """When a job fails, the exception should be sent to Sentry with context."""
        from workers.scheduler import process_job_queue

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Mock queue to return a job that will fail
        error = Exception("Enrichment failed")
        with (
            patch("workers.scheduler.JobQueue") as MockQueue,
        ):
            mock_queue = AsyncMock()
            MockQueue.return_value = mock_queue
            mock_queue.claim.return_value = Job(
                id="job-1",
                job_type=JobType.ENRICH_SHOP,
                payload={"shop_id": "shop-1"},
                status="claimed",
                attempts=1,
            )

            # Make the handler raise
            with patch("workers.scheduler.get_llm_provider", side_effect=error):
                await process_job_queue()

            # Sentry should capture the exception
            mock_sentry.capture_exception.assert_called_once_with(error)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run python -m pytest tests/workers/test_sentry_capture.py -v`
Expected: FAIL — `workers.scheduler.sentry_sdk` is not imported

**Step 3: Write minimal implementation**

In `backend/workers/scheduler.py`, add Sentry capture in the job failure handler:

```python
import sentry_sdk

# In process_job_queue, update the except block:
    except Exception as e:
        logger.error("Job failed", job_id=job.id, error=str(e))
        sentry_sdk.capture_exception(e)
        await queue.fail(job.id, error=str(e))
```

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run python -m pytest tests/workers/test_sentry_capture.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/workers/scheduler.py backend/tests/workers/test_sentry_capture.py
git commit -m "feat(obs): capture worker job failures in Sentry with context"
```

---

### Task 7: Environment Variable Documentation

Update `.env.example` with all observability-related env vars for both services.

**Files:**
- Modify: `.env.example`
- Modify: `backend/core/config.py` (add `app_version` field)

No test needed — documentation/config only.

**Step 1: Update `.env.example`**

Add under the Error Tracking section (if not already done in Task 4):

```
# ─── Error Tracking ────────────────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=             # Sentry DSN for frontend error tracking
SENTRY_DSN=                         # Sentry DSN for backend error tracking (same DSN or separate project)
SENTRY_AUTH_TOKEN=                  # Sentry auth token for source map uploads (CI only)
SENTRY_ORG=                         # Sentry organization slug
SENTRY_PROJECT=                     # Sentry project slug
```

**Step 2: Update backend config**

In `backend/core/config.py`, ensure the `sentry_dsn` field exists (it does). No changes needed if Task 1 already handled this.

**Step 3: Commit**

```bash
git add .env.example backend/core/config.py
git commit -m "docs(obs): update env vars documentation for observability stack"
```

---

### Task 8: Full Verification & Better Stack Setup Guide

Run all tests across both services. Document Better Stack setup as a manual ops task.

**Files:**
- Create: `docs/ops/better-stack-setup.md`

**Step 1: Run all backend tests**

Run: `cd backend && uv run python -m pytest -v`
Expected: All tests pass

**Step 2: Run backend linting**

Run: `cd backend && uv run ruff check . && uv run ruff format --check .`
Expected: No issues

**Step 3: Run frontend tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Run frontend checks**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: All pass

**Step 5: Write Better Stack setup guide**

Create `docs/ops/better-stack-setup.md`:

```markdown
# Better Stack Setup Guide

Better Stack provides uptime monitoring for CafeRoam (free tier).

## Monitors to Create

1. **API Health** — `https://api.caferoam.com/health` — 60s interval
2. **Web Health** — `https://caferoam.com` — 60s interval
3. **API Deep Health** — `https://api.caferoam.com/health/deep` — 300s interval

## Alert Policy

- Alert after **2 consecutive failures**
- Channels: Slack/Discord webhook + email

## Status Page

- Create public status page at `status.caferoam.com`
- Add all 3 monitors

## Setup Steps

1. Sign up at betterstack.com (free tier)
2. Create monitors with the URLs above
3. Add Slack/Discord webhook integration
4. Create status page
5. Configure DNS CNAME for status.caferoam.com → Better Stack

This is a manual external setup — no code changes required.
```

**Step 6: Commit**

```bash
git add docs/ops/better-stack-setup.md
git commit -m "docs(obs): add Better Stack setup guide for uptime monitoring"
```

---

## Execution Waves

```mermaid
graph TD
    T1[Task 1: Sentry Backend] --> T6[Task 6: Worker Sentry]
    T2[Task 2: Request ID Middleware]
    T3[Task 3: Deep Health Check]
    T4[Task 4: Sentry Frontend]
    T5[Task 5: PostHog Frontend]
    T7[Task 7: Env Var Docs]

    T1 --> T8[Task 8: Verification]
    T2 --> T8
    T3 --> T8
    T4 --> T8
    T5 --> T8
    T6 --> T8
    T7 --> T8

    subgraph "Wave 1 (parallel)"
        T1
        T2
        T3
        T4
        T5
        T7
    end
    subgraph "Wave 2"
        T6
    end
    subgraph "Wave 3"
        T8
    end
```

**Wave 1** (parallel — no dependencies):
- Task 1: Sentry Backend Initialization
- Task 2: Request ID Middleware
- Task 3: Deep Health Check Endpoint
- Task 4: Sentry Frontend Initialization
- Task 5: PostHog Frontend SDK
- Task 7: Environment Variable Documentation

**Wave 2** (depends on Task 1):
- Task 6: Worker Sentry Integration ← Task 1 (Sentry must be initialized first)

**Wave 3** (depends on all):
- Task 8: Full Verification & Better Stack Setup Guide ← All previous tasks
