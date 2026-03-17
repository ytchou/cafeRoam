# GPS Coordinates in Analytics Events Are a PDPA Violation
**Date:** 2026-03-17
**Context:** Tarot Surprise Me feature — explore page sent lat/lng to PostHog on every draw

## What happened
`app/explore/page.tsx` captured `tarot_draw_loaded` and `tarot_empty_state` events with `{ lat, lng }` included. PostHog is an external analytics service. Sending precise GPS coordinates to a third party without explicit consent is a PDPA violation.

## Root cause
The GPS values were already in scope as React state (needed for the API call), so it was natural to include them in the analytics event. The developer did not consider that PostHog is an external processor outside the Supabase data boundary.

## Prevention
- Never pass `lat`, `lng`, `latitude`, `longitude`, or any geolocation field to PostHog events.
- If location context is needed for analytics, use coarse proxies: city-level district name, neighborhood, or a bucketed radius (e.g., `"within 3km"`).
- CLAUDE.md: "Never store user PII outside Supabase (no logs, no analytics events with email or raw user IDs)" — treat GPS as PII.
- When reviewing analytics event captures, flag any argument that could identify a physical location precisely.
