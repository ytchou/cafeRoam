# JWT claims are stale immediately after exchangeCodeForSession()
**Date:** 2026-02-25
**Context:** Auth callback route writing PDPA consent to profiles after OAuth code exchange

## What happened
The auth callback called `exchangeCodeForSession()` to complete the OAuth flow, then wrote `pdpa_consent_at` to the `profiles` table, then redirected the user. On the next page load, middleware saw `pdpa_consented: false` in the JWT and redirected to the consent page — even though consent was already recorded.

## Root cause
Supabase's JWT claim hook (`custom_access_token_hook`) runs at **token mint time**, not at read time. `exchangeCodeForSession()` mints the token *before* any subsequent DB writes. Those writes are not reflected in the current token until the token is refreshed (either by expiry + auto-refresh, or by explicit `refreshSession()` call).

## Prevention
After any DB write that should be reflected in JWT custom claims, call:
```typescript
await supabase.auth.refreshSession();
```
This forces a new token mint, triggering the claim hook to read the updated DB state. This applies to both client-side (`@supabase/ssr` browser client) and server-side (Route Handler) callers.

**Affected claim sources:** Any column read by the JWT hook function (currently `profiles.pdpa_consent_at` and `profiles.deletion_requested_at`).
