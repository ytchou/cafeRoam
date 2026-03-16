# ADR: Playwright for browser-level E2E testing

Date: 2026-03-16

## Decision

Use Playwright (not Cypress) for browser-level E2E testing, with a two-workflow CI model (PR-blocking critical paths + nightly full suite).

## Context

CafeRoam's e2e tests are manual API-level smoke tests. Browser-level flows (geolocation, map interactions, responsive layouts) have no automated coverage. We needed a browser testing framework that supports geolocation mocking, mobile viewport emulation, and efficient CI execution.

## Alternatives Considered

- **Cypress**: Mature ecosystem, good DX. Rejected: no native geolocation mocking (requires plugins), single-browser architecture, slower CI parallelization, no mobile device emulation.
- **Manual Playwright MCP only (no test files)**: Already available via `/e2e-smoke` skill. Rejected as sole approach: not CI-runnable, not repeatable without human, no regression detection.
- **Single CI workflow (all tests on every PR)**: Simpler to configure. Rejected: 30+ browser tests would slow PR feedback to 5-10 minutes; most regressions caught by 10 critical paths.

## Rationale

Playwright provides native `context.setGeolocation()`, multi-device `projects` (iPhone 14 + Desktop Chrome), built-in `webServer` auto-start, and `--grep` tag filtering — all features CafeRoam needs without plugins. The two-workflow split keeps PRs fast (10 critical tests, ~2 min) while maintaining full coverage nightly.

## Consequences

- Advantage: Geolocation, responsive layout, and map interaction flows get automated coverage
- Advantage: PR feedback stays fast (critical paths only)
- Advantage: One-line switch to Railway staging via `E2E_BASE_URL` env var
- Disadvantage: New dependency (`@playwright/test`) and CI runner setup
- Disadvantage: Nightly failures need monitoring (Slack/email notification setup)
