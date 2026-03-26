# Design: GA4 + Shared Cookie Consent Banner (DEV-30)

Date: 2026-03-26

## Context

CafeRoam uses PostHog for in-app product analytics (7 spec events, centralized backend gateway, PDPA-compliant anonymization). However, two gaps exist:

1. **No GA4** — can't link Google Search Console to on-site behavior, no Google Ads readiness, no unauthenticated traffic visibility outside PostHog
2. **No cookie consent** — PostHog auto-initializes without user consent, violating Taiwan PDPA requirements for explicit opt-in before dropping analytics cookies

This design adds GA4 for full-funnel analytics (all pages) and a shared cookie consent banner that gates both GA4 and PostHog.

## Architecture: Consent-First Provider Pattern

A `ConsentProvider` React context owns all consent state. GA4 and PostHog both react to it.

```
app/layout.tsx
└── ConsentProvider (new)
    ├── CookieConsentBanner (new, shadcn/ui)
    ├── GoogleAnalytics (@next/third-parties, consent mode v2)
    └── PostHogProvider (existing, modified to defer init)
```

### Data Flow

1. User lands → `ConsentProvider` reads `caferoam_consent` cookie
2. If no cookie → banner shown, GA4 loads in `denied` state, PostHog does NOT init
3. User clicks Accept → cookie set to `granted`, GA4 consent updated via `gtag('consent', 'update', ...)`, PostHog `init()` called
4. User clicks Reject → cookie set to `denied`, GA4 stays denied (cookieless modeling only), PostHog never inits
5. Subsequent visits → cookie read, providers initialized accordingly (no banner)

## Components

### 1. ConsentProvider (`lib/consent/provider.tsx`)

- React context: `{ consent: 'granted' | 'denied' | 'pending', updateConsent: (value) => void }`
- Reads/writes `caferoam_consent` cookie (365 days, SameSite=Lax, path=/)
- On mount: reads cookie. If absent → `pending` (show banner). If present → stored value.
- `updateConsent()` sets cookie + notifies all consumers via context

### 2. useConsent hook (`lib/consent/use-consent.ts`)

- Convenience hook: `const { consent, updateConsent } = useConsent()`

### 3. CookieConsentBanner (`components/cookie-consent-banner.tsx`)

- Fixed bottom banner, minimal design (shadcn Card + Button)
- Copy: "We use cookies to analyze traffic and improve your experience."
- Two buttons: Accept / Reject
- Link to privacy policy
- Only renders when `consent === 'pending'`
- Mobile-first: full-width on small screens, constrained on desktop

### 4. GA4 Integration (`lib/analytics/ga4.tsx`)

- Uses `@next/third-parties` `GoogleAnalytics` component
- On mount: sets default consent to `denied` via `gtag('consent', 'default', { analytics_storage: 'denied' })`
- Listens to `ConsentProvider` — when `granted`, fires `gtag('consent', 'update', { analytics_storage: 'granted' })`
- Measurement ID from `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var
- Always loads (even when denied) — consent mode v2 allows cookieless pings for behavioral modeling

### 5. Modified PostHogProvider (`lib/posthog/provider.tsx`)

- Consume `ConsentProvider`
- `granted`: call `posthog.init()` (current behavior)
- `denied` or `pending`: skip init entirely, or call `posthog.opt_out_capturing()` if already initialized
- Transition from `pending` → `granted`: init PostHog dynamically

## GA4 Custom Events

Four lightweight events fired client-side via `gtag('event', ...)`:

| Event | When | Parameters |
|-------|------|------------|
| `search` | Unauthenticated directory search | `search_term` |
| `shop_detail_view` | Any shop detail page open | `shop_id` |
| `signup_cta_click` | CTA button clicks prompting auth | `cta_location` (header/card/banner) |
| `page_view` | Automatic (GA4 built-in) | — |

These are intentionally simple — no PII, no user IDs. Rich event tracking stays in PostHog.

## Environment Variables

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=    # GA4 measurement ID (G-XXXXXXXXXX)
```

Update `scripts/doctor.sh` with a check for `NEXT_PUBLIC_GA_MEASUREMENT_ID` (warn-only, not blocking — GA4 is optional for local dev).

## Error Handling

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` empty: GA4 component renders nothing, no errors
- `NEXT_PUBLIC_POSTHOG_KEY` empty: PostHog doesn't init (existing behavior)
- Consent cookie corruption: treat as `pending`, show banner again
- Both env vars empty: consent banner still shows (future-proofing), but no providers fire

## PDPA Compliance

- Consent is required before any analytics cookies are set
- GA4 consent mode v2: loads in "denied" state, only sets cookies after explicit consent
- PostHog: fully blocked until consent granted
- Reject = no analytics cookies, only GA4 cookieless modeling pings
- Consent preference stored in `caferoam_consent` cookie (not httpOnly — must be client-readable, contains no sensitive data)

## Testing Strategy

### Frontend (Vitest + Testing Library)

- `ConsentProvider` — test cookie read/write, state transitions (pending → granted, pending → denied)
- `CookieConsentBanner` — test render when pending, hidden when granted/denied, button clicks update consent
- GA4 integration — test that `gtag` is called with correct consent states
- PostHog modification — test that `posthog.init()` is NOT called when consent is pending/denied

### No backend changes needed

GA4 is purely client-side. The existing PostHog backend gateway is unaffected.

### Testing Classification

**(a) New e2e journey?**
- [ ] No — cookie consent is a UX overlay, not a new critical user path

**(b) Coverage gate impact?**
- [ ] No — doesn't touch critical-path services (search, checkin, lists)

## Files Changed

| File | Change |
|------|--------|
| `lib/consent/provider.tsx` | **New** — ConsentProvider context |
| `lib/consent/use-consent.ts` | **New** — `useConsent()` hook |
| `components/cookie-consent-banner.tsx` | **New** — Banner UI |
| `lib/analytics/ga4.tsx` | **New** — GA4 wrapper with consent mode v2 |
| `lib/posthog/provider.tsx` | **Modified** — consume ConsentProvider, defer init |
| `app/layout.tsx` | **Modified** — wrap with ConsentProvider, add GA4 |
| `.env.example` | **Modified** — add `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| `scripts/doctor.sh` | **Modified** — add GA4 env var check (warn-only) |
| `package.json` | **Modified** — add `@next/third-parties` |

## Decisions

- **GA4 on all pages** (not just unauthenticated) — enables full landing-to-activation funnel in GA4 alongside PostHog's detailed in-app analytics
- **Shared consent banner** — one system gates both GA4 and PostHog, fixes existing PDPA gap
- **@next/third-parties** over GTM — simpler, official Next.js integration
- **Custom banner** over library — matches CafeRoam design system, no extra dependency
- **Consent-First Provider Pattern** — React context owns consent state, both providers react to it
