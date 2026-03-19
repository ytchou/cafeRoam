# ADR: Consolidate typography to two font families

Date: 2026-03-19

## Decision
Use Bricolage Grotesque (headings/titles) and DM Sans (body/meta/nav) as the two font families across the entire app.

## Context
The design.pen screens used three fonts: Bricolage Grotesque for headings, DM Sans for body text, and Inter for desktop navigation. The existing codebase used Geist Sans + Noto Sans TC. We needed to align the implementation with the design while keeping font count minimal for performance and visual cohesion.

## Alternatives Considered
- **Three fonts (Bricolage Grotesque + DM Sans + Inter)**: Matches design.pen exactly. Rejected: Inter adds a third HTTP request and is visually indistinguishable from DM Sans at nav sizes. No meaningful benefit.
- **Map to existing Geist stack**: Keep Geist Sans for everything. Rejected: Geist lacks the personality that Bricolage Grotesque brings to headings. The designs intentionally chose distinctive typography.

## Rationale
Two fonts balances design personality with performance. Bricolage Grotesque provides the warm, distinctive heading style that defines CafeRoam's visual identity. DM Sans is a versatile body font that works well at small sizes for meta text, tags, and navigation labels. Dropping Inter reduces load time without any visible quality loss — DM Sans at 14px is equally readable for nav items.

## Consequences
- Advantage: Fewer font files to load, more cohesive typography
- Advantage: Clear role separation — heading vs body — makes font usage predictable
- Disadvantage: Desktop nav won't pixel-match the design.pen Inter usage (negligible visual difference)
