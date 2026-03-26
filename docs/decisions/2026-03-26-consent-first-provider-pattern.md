# ADR: Consent-First Provider Pattern for Analytics

Date: 2026-03-26

## Decision

Use a shared ConsentProvider React context that gates both GA4 and PostHog initialization, with a custom cookie consent banner built on shadcn/ui.

## Context

Taiwan PDPA requires explicit consent before dropping analytics cookies. PostHog currently auto-initializes without consent — a compliance gap. Adding GA4 means two analytics providers need consent gating. The options were: shared custom consent, third-party consent library, or GTM as orchestrator.

## Alternatives Considered

- **GTM as consent orchestrator**: Google Tag Manager manages both GA4 and PostHog via its built-in consent mode. Rejected: adds GTM dependency (contradicts choosing @next/third-parties), PostHog-via-GTM loses features (session replay, feature flags).
- **PostHog as consent hub**: Each provider uses its own consent API, both reading from a shared cookie. Rejected: two separate consent implementations with fragile coupling, harder to maintain.
- **Third-party consent library** (react-cookie-consent, OneTrust): Rejected: adds dependency, needs custom styling to match CafeRoam design system. Custom banner is ~50 lines of code with shadcn/ui.

## Rationale

A single React context owning consent state is the cleanest pattern. GA4 uses consent mode v2 (loads in denied state, updates on consent), PostHog defers initialization entirely until consent is granted. One cookie (`caferoam_consent`) stores the preference. The custom banner matches the design system without extra dependencies.

## Consequences

- Advantage: Single consent system for all current and future analytics providers
- Advantage: PDPA compliant — no cookies set before explicit consent
- Advantage: GA4 consent mode v2 still collects cookieless modeling data when denied
- Disadvantage: Must manually update ConsentProvider when adding new analytics providers (mitigated: provider-agnostic backend abstraction already handles this pattern)
