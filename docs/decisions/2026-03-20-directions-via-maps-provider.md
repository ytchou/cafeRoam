# ADR: Route Mapbox Directions API through backend MapsProvider

Date: 2026-03-20

## Decision

Extend the existing `MapsProvider` protocol with a `get_directions()` method rather than calling the Mapbox Directions API directly from the browser.

## Context

The `DirectionsSheet` component was initially built calling Mapbox Directions API directly from the browser using `NEXT_PUBLIC_MAPBOX_TOKEN`. This works functionally but breaks the established provider abstraction pattern where all external API calls go through backend adapters.

## Alternatives Considered

- **Browser-direct calls (status quo)**: Keep `fetchRoute()` calling Mapbox from the client. Rejected: violates provider abstraction, exposes API call patterns to browser, harder to add caching or swap providers later.
- **Standalone FastAPI endpoint**: New route calling Mapbox directly without going through the provider layer. Rejected: creates a parallel integration path, undermines the protocol-based abstraction.

## Rationale

The project has an established `MapsProvider` protocol with `geocode()` and `reverse_geocode()`. Adding `get_directions()` is a natural extension. The backend already holds the Mapbox server token (`MAPBOX_ACCESS_TOKEN`), and routing through the provider layer keeps all Mapbox integration in one adapter class. This also enables future optimizations (e.g., caching static MRT→shop walking times) without frontend changes.

## Consequences

- Advantage: Consistent provider abstraction — all Mapbox calls go through one adapter
- Advantage: Server token with tighter restrictions replaces public token for directions
- Advantage: Enables future caching of static route segments
- Disadvantage: Adds one network hop (browser → Next.js proxy → FastAPI → Mapbox) vs. browser → Mapbox directly
- Disadvantage: Slightly more code (provider method + API route + proxy route)
