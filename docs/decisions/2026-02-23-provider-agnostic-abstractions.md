# ADR: Provider-Agnostic Abstraction Layer for External Services

Date: 2026-02-23

## Decision

All external services (LLM enrichment, vector embeddings, email, maps, analytics) are accessed through TypeScript interfaces with provider-specific adapters. Business logic never imports provider SDKs directly.

## Context

CafeRoam depends on multiple external providers whose quality and cost characteristics are not fully known at launch: LLM provider for enrichment (Claude Haiku selected initially, but Gemini is a candidate), embedding provider (OpenAI selected, Google is a fallback), email (Resend selected, SendGrid/Postmark are candidates), maps (Mapbox selected, Google Maps is a candidate), analytics (PostHog selected). The founder explicitly requested the ability to test different providers, especially for email, analytics, and LLM enrichment.

## Alternatives Considered

- **Direct provider SDK imports**: Simplest implementation. Rejected: if any provider changes pricing, deprecates an endpoint, or underperforms, changing providers requires touching every file that imports the SDK.
- **Thin wrapper functions**: Simple function wrappers per provider. Rejected: doesn't enforce the abstraction — developers can still import the SDK directly, and wrappers don't express the full contract.

## Rationale

The Adapter pattern with TypeScript interfaces enforces the abstraction at the type level. The pattern:

1. `[service].interface.ts` — defines the contract (e.g., `IEmailProvider.send(to, subject, body)`)
2. `[provider].adapter.ts` — implements the interface using the provider's SDK
3. `index.ts` — factory function reads env var (`EMAIL_PROVIDER=resend`) and returns the active adapter

Business logic imports only from `lib/providers/[service]` — never from provider SDKs. This is enforced via ESLint rules. Swapping a provider = adding a new adapter file + changing one env var. Zero business logic changes.

## Consequences

- Advantage: Provider swap requires only a new adapter file + env var change
- Advantage: Adapters are easily unit-tested with mock implementations
- Advantage: Enforces clean architecture — business logic has no knowledge of provider internals
- Advantage: Can A/B test providers in production (run two adapters, compare metrics)
- Disadvantage: Small upfront overhead — must define interface before implementing
- Disadvantage: Developers must remember to add new methods to the interface first
- Locked into: The interface contracts — adding a new capability to a provider requires updating the interface and all adapters
