# ADR: Web-First over Native App

Date: 2026-02-23

## Decision

Build CafeRoam as a mobile-first web application (Next.js, responsive at 390px) rather than a native iOS/Android app for V1. Native app is explicitly deferred to V2.

## Context

CafeRoam's primary distribution channel is Threads — users share links when answering "where should I go?" questions. This requires shareable URLs that open instantly in a browser. The retention mechanics (check-ins, stamps, lists) were considered as potential justification for native app features.

## Alternatives Considered

- **Native app only**: No web presence. Rejected: Threads distribution is broken — sharing an App Store link instead of a direct URL introduces 4+ friction steps (App Store → download → install → open) that kill conversion. Also loses all SEO traffic permanently.
- **Both web + native simultaneously**: Full coverage. Rejected: solo developer building both simultaneously halves the quality of each. 2-4 week timeline doesn't support dual-platform development.
- **React Native/Expo**: Cross-platform native app. Rejected: same timeline issue as above, plus additional complexity (native modules, platform-specific bugs, app store review delays slow iteration).

## Rationale

Web-first is not a compromise — it's the strategic distribution choice. Every Taiwan competitor (Cafeting, Thirsty Bean) is app-first, which means none of them can be shared as a link in a Threads reply. This is a structural disadvantage they cannot easily fix.

Check-in UX, collectibles, and lists all work well on mobile web (see: Swarm, Letterboxd, Notion). Push notifications are the one native advantage; the weekly email covers V1 retention needs without them.

SEO is a long-term traffic source that requires web. A native-only product never accumulates it.

## Consequences

- Advantage: Threads distribution mechanic works (shareable URLs open instantly)
- Advantage: SEO accumulates over time — "Taipei coffee shop [attribute]" queries find CafeRoam
- Advantage: Solo developer can ship one polished product in 2-4 weeks
- Advantage: No App Store review delays — ship and users see it immediately
- Disadvantage: Push notifications less reliable than native (weekly email covers V1)
- Disadvantage: App Store discoverability not available until V2
- Locked into: Web as primary surface; native app requires separate investment in V2
