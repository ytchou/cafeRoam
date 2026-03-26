# GA4 Consent Mode v2: useEffect fires after script load

**Date:** 2026-03-26
**Context:** feat/ga4-consent code review — GA4Provider implementation

**What happened:**
`gtag('consent', 'default', ...)` was called inside a `useEffect`, using `window.gtag?.()` with optional chaining. For returning visitors whose `caferoam_consent` cookie was already `granted`, the consent update also fired in `useEffect`. Because `@next/third-parties` loads the GA4 script with `strategy="afterInteractive"` (default), `window.gtag` may not be defined when these effects run — the optional chaining silently no-ops both calls.

**Root cause:**
GA4 consent mode v2 requires the `gtag('consent', 'default', ...)` call to arrive in the `dataLayer` queue _before_ the GA4 script processes it. React `useEffect` runs after paint, at the same time as deferred scripts — there is no guaranteed ordering.

**Prevention:**
Never use `window.gtag?.()` for consent default/update calls. Instead, bootstrap the queue first:

```ts
function ensureGtagQueue() {
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    // Must be a regular function — arrow functions don't bind `arguments`
    // eslint-disable-next-line prefer-rest-params
    window.gtag = function gtag() {
      (window.dataLayer as unknown[]).push(arguments);
    };
  }
}
// Then call window.gtag!('consent', 'default', { ... }) — non-optional
```

This pre-queues the consent command so GA4 drains it on init, regardless of script load timing. The `!` assertion is safe because `ensureGtagQueue` guarantees `gtag` exists.
