# ADR: Client-Side Canvas for Share Card Generation

Date: 2026-03-17

## Decision
Share card images for the tarot feature are generated client-side using `html2canvas` (or raw Canvas API), not server-side.

## Context
The tarot "Share My Draw" feature generates a portrait card (1080×1920) optimized for Threads/Instagram Stories. The card contains the shop photo, tarot title, shop name, neighborhood, and date — no app chrome.

## Alternatives Considered
- **Server-side with Satori/Vercel OG**: Generate images on the backend using Satori (JSX → SVG → PNG). Rejected for V1: adds a Node.js rendering dependency to a Python backend, or requires a separate Next.js API route with Satori. Increases infrastructure complexity for a feature whose usage volume is unknown.
- **Server-side with Puppeteer/Playwright**: Render HTML in a headless browser on the server. Rejected: heavy dependency, slow cold starts, overkill for a single card image.

## Rationale
Client-side generation is zero-infrastructure. The card layout is simple (photo + text + branding), well within `html2canvas` capabilities. Mobile browsers support `navigator.share({ files: [blob] })` for native sharing. The feature can ship and iterate without backend changes. If share volume becomes high or quality issues arise, we can migrate to server-side later.

## Consequences
- Advantage: No backend infrastructure, ships faster, iterates on design without deploys
- Advantage: Works offline once data is loaded
- Disadvantage: Font rendering may vary across browsers/devices
- Disadvantage: Cannot generate share cards for link previews (OG images) — that's a separate concern if needed later
