# ADR: LINE Login via Supabase Custom OIDC Provider

Date: 2026-02-25

## Decision

Configure LINE Login as a custom OIDC provider in Supabase Auth, rather than building a manual OAuth flow in the Python backend.

## Context

LINE is the dominant messaging platform in Taiwan and a natural auth option for a Taiwan-focused product. Supabase does not have a native LINE provider. Two implementation paths exist.

## Alternatives Considered

- **Manual OAuth in Python backend**: Backend handles LINE OAuth redirect, token exchange, and user creation via Supabase Admin API. Rejected: OAuth redirect flows require the browser; proxying them through a backend server adds complexity, a failure point, and makes the callback URL harder to configure correctly. Also duplicates auth session management already handled by the Supabase JS SDK.

## Rationale

Supabase supports custom OIDC providers via its dashboard. LINE Login implements OpenID Connect (`https://access.line.me/.well-known/openid-configuration`), making it compatible. This approach means LINE users appear as regular Supabase auth users — no special casing in the app. Session management, token refresh, and cookie handling all work identically to Google OAuth. Supabase JS SDK calls `signInWithOAuth({ provider: 'line_oidc' })` identically to any other provider.

## Consequences

- Advantage: Zero custom OAuth code; LINE users managed identically to email/Google users
- Advantage: Token refresh and session management handled by Supabase SDK automatically
- Disadvantage: Depends on Supabase's custom OIDC support remaining stable
- Disadvantage: LINE Developer Console setup required (Client ID, Client Secret, callback URL registration) before this can be tested
