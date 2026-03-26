# ADR: GA4 Alongside PostHog for Dual Analytics

Date: 2026-03-26

## Decision

Add Google Analytics 4 on all pages alongside PostHog, with GA4 focused on traffic/acquisition analytics and PostHog on product analytics.

## Context

CafeRoam invested in SEO (sitemap, JSON-LD, llms.txt — PR #74) but has no way to link organic search performance to on-site behavior. PostHog handles in-app product analytics well but lacks Google Search Console integration, Google Ads readiness, and industry benchmarking.

## Alternatives Considered

- **PostHog only**: Simpler stack, fewer dependencies. Rejected: no Search Console integration, no Google Ads readiness, PostHog custom events require auth (missing unauthenticated traffic insights).
- **GA4 on unauthenticated pages only**: Cleaner separation. Rejected: loses the signup-to-activation funnel in GA4, requires route-based conditional loading complexity.
- **Replace PostHog with GA4**: Single platform. Rejected: GA4 lacks PostHog's product analytics depth (funnels, cohorts, session replay, feature flags, typed event schemas).

## Rationale

GA4's unique value is the Google ecosystem: Search Console feedback loop for SEO investment, future Google Ads Smart Bidding, and industry benchmarks. PostHog's unique value is deep product analytics with the existing centralized gateway and PDPA compliance. The two tools are complementary, not redundant — GA4 tracks pageviews + 4 lightweight events while PostHog handles the 7 typed spec events with rich properties.

## Consequences

- Advantage: Full-funnel visibility from organic search → landing → signup → in-app
- Advantage: Search Console integration closes the SEO feedback loop
- Advantage: Google Ads readiness for future paid acquisition
- Disadvantage: Two analytics platforms to maintain (mitigated by GA4 being low-touch — only pageviews + 4 events)
- Disadvantage: Slightly larger page weight from GA4 script (~28KB gzipped)
