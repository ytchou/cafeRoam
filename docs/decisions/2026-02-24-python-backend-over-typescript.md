# ADR: Python (FastAPI) Backend Over Full-Stack TypeScript

Date: 2026-02-24

## Decision

Move all backend code (API routes, services, providers, workers) from TypeScript/Node.js to Python/FastAPI. TypeScript remains for the Next.js frontend and the prebuild data pipeline only.

## Context

CafeRoam was originally designed as a full-stack TypeScript monorepo. At the time of this decision, the backend consisted almost entirely of interface stubs and 501-returning API routes — no production backend code had been implemented. This made it an ideal time to change the backend language without migration risk.

## Alternatives Considered

- **Full-stack TypeScript (status quo)**: Single language across the stack. Rejected: team is more productive in Python for backend work, and the Python AI/ML ecosystem (Anthropic SDK, OpenAI SDK, data processing libraries) is more mature than the TypeScript equivalents.

- **Go backend**: High performance, small binary, good for microservices. Rejected: steeper learning curve, less relevant ecosystem for AI-heavy workloads, overkill for V1 scale.

- **Gradual migration (keep both)**: Add Python services behind existing Next.js routes one-by-one. Rejected: since backend is all stubs, a clean break is lower complexity than maintaining two parallel backend implementations during transition.

## Rationale

1. **Team productivity**: The team is significantly more productive writing Python backend code than TypeScript backend code.
2. **Ecosystem access**: Python's AI/ML ecosystem (Anthropic, OpenAI, data processing) is more mature, better documented, and has more community support.
3. **Clean separation**: A distinct frontend (TypeScript) and backend (Python) boundary enforces architectural discipline — no accidental coupling between frontend rendering logic and backend business logic.
4. **Zero migration risk**: Backend is entirely stubs/interfaces. There is no production TypeScript backend code to port or maintain.
5. **FastAPI specifically**: Async-first, auto-generated OpenAPI docs, Pydantic validation, and `Depends()` dependency injection align well with the existing provider abstraction architecture.

## Consequences

- **Advantage**: Higher team productivity, better Python ecosystem access, clean frontend/backend boundary
- **Advantage**: FastAPI's `Depends()` provides native dependency injection, replacing the manual factory pattern
- **Advantage**: Pydantic models provide runtime validation + serialization in one place
- **Disadvantage**: Two dependency systems (pnpm + uv), two test frameworks (Vitest + pytest), two linters (ESLint + ruff)
- **Disadvantage**: No shared type definitions between frontend and backend — types must be maintained separately
- **Disadvantage**: Dev environment setup slightly more complex (Python + Node.js prerequisites)
