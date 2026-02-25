# Auth & Privacy Design

Date: 2026-02-25
Status: Approved
TODO section: Phase 1 › Auth & Privacy

---

## Overview

Implements end-to-end authentication (email/password, Google OAuth, LINE Login) and PDPA-compliant privacy features (consent flow, account deletion with 30-day grace period) for CafeRoam.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌────────────────────┐    ┌──────────────────────────────┐ │
│  │  Next.js App        │    │  Supabase JS SDK (@supabase/ │ │
│  │  (App Router)       │◄──►│  ssr)                        │ │
│  │                     │    │  - signup/login/OAuth flows   │ │
│  │  middleware.ts       │    │  - session cookies            │ │
│  │  (route guards)     │    │  - token refresh              │ │
│  └────────┬───────────┘    └──────────┬───────────────────┘ │
└───────────┼────────────────────────────┼─────────────────────┘
            │ JWT in                     │ Direct auth
            │ Authorization header       │ (signup/login/OAuth)
            ▼                            ▼
┌────────────────────┐        ┌──────────────────────┐
│  Python Backend     │        │  Supabase Auth        │
│  (FastAPI)          │        │  - Email/password     │
│                     │        │  - Google OAuth       │
│  - JWT validation   │        │  - LINE OIDC (custom) │
│  - Profile mgmt     │        │  - Token issuance     │
│  - PDPA consent     │        └──────────┬───────────┘
│  - Account deletion │                   │
│  - Protected routes  │                   │ auth.users
└────────┬───────────┘                   │ cascade
         │ service role                   ▼
         │ (workers only)      ┌──────────────────────┐
         └────────────────────►│  Supabase Postgres    │
                               │  - profiles (RLS)     │
                               │  - all user tables     │
                               └──────────────────────┘
```

**Hybrid auth model:** Frontend (Supabase JS SDK) owns auth flows and session management. Backend (Python FastAPI) validates JWTs and owns business logic (PDPA consent, account deletion). OAuth redirect flows must live in the browser — proxying them through the backend would be fragile.

---

## Auth Flows

### Signup (email/password)

1. User fills: email, password, PDPA consent checkbox (required, links to privacy policy)
2. Frontend calls `supabase.auth.signUp({ email, password })`
3. Supabase sends verification email; user confirms
4. Supabase Auth fires `auth.users` insert → DB trigger creates `profiles` row
5. Frontend calls `POST /auth/consent` → backend sets `pdpa_consent_at = NOW()`
6. Frontend redirects to app (or `returnTo` param)

### Signup (Google / LINE OAuth)

1. Frontend calls `supabase.auth.signInWithOAuth({ provider })` with `redirectTo: /auth/callback`
2. User authenticates with provider → redirected to `/auth/callback`
3. Callback page calls `supabase.auth.exchangeCodeForSession(code)` → session established
4. Check `pdpa_consented` custom JWT claim — if false (new user), redirect to `/onboarding/consent`
5. Otherwise redirect to app

### Login (email/password)

1. Frontend calls `supabase.auth.signInWithPassword({ email, password })`
2. SDK stores session in cookies; redirects to app or `returnTo`

### Logout

1. Frontend calls `supabase.auth.signOut()` → clears cookies → redirects to `/`

---

## PDPA Consent Flow

**Trigger:** All new users (email signup after verification, OAuth on first login).

**Consent page (`/onboarding/consent`):**

```
┌─────────────────────────────────────────────────┐
│  啡遊 使用前請確認                                │
│                                                   │
│  我們蒐集以下資料：                               │
│  • 帳號資訊（Email 或社群帳號 ID）               │
│  • 打卡記錄與照片                                 │
│  • 您建立的咖啡廳清單                            │
│                                                   │
│  用途：提供個人化服務、改善搜尋品質              │
│  保留期間：帳號存續期間；刪除帳號後30天內清除   │
│  您的權利：可隨時至「帳號設定」申請刪除帳號     │
│                                                   │
│  詳見《隱私權政策》                              │
│                                                   │
│  ☐ 我已閱讀並同意上述說明                       │
│                                                   │
│  [確認並繼續]  (disabled until checkbox checked) │
└─────────────────────────────────────────────────┘
```

**Backend: `POST /auth/consent`**
- Requires valid JWT
- Sets `pdpa_consent_at = NOW()` on calling user's profile
- Idempotent — no-op if already set
- Returns 200

**Enforcement:** `middleware.ts` checks the `pdpa_consented` custom JWT claim for all protected routes. Session without consent → redirect to `/onboarding/consent`.

**Photo usage disclosure:** Inline on the check-in form only. Not part of this consent step. Text: "菜單照片可能用於改善咖啡廳資訊。"

---

## Account Deletion (30-Day Soft Delete)

### Schema change

```sql
ALTER TABLE profiles ADD COLUMN deletion_requested_at TIMESTAMPTZ;
```

### Initiation flow

1. User: Settings → "Delete account" → confirmation dialog (type "DELETE")
2. `DELETE /auth/account` → backend sets `deletion_requested_at = NOW()` on profile
3. Frontend calls `supabase.auth.signOut()` → redirects to `/`

### Grace period recovery

- User logs in during 30-day window → succeeds
- Middleware detects `deletion_requested_at IS NOT NULL` → redirects to `/account/recover`
- Recovery page: show scheduled deletion date → "Cancel deletion" → `POST /auth/cancel-deletion` clears `deletion_requested_at`

### Scheduled cleanup (daily APScheduler job)

```python
# backend/workers/handlers/account_deletion.py
async def delete_expired_accounts():
    # 1. Query profiles WHERE deletion_requested_at < NOW() - INTERVAL '30 days'
    # 2. For each expired profile:
    #    a. List and delete Storage objects (check-in photos, menu photos)
    #    b. supabase.auth.admin.deleteUser(uid)
    #       → DB CASCADE handles: profiles → lists → list_items → check_ins → stamps
```

Storage cleanup must be explicit — there is no cascade from DB into Supabase Storage.

### Backend routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/consent` | Record PDPA consent |
| `DELETE` | `/auth/account` | Initiate soft delete |
| `POST` | `/auth/cancel-deletion` | Cancel within grace period |

---

## Session Management & Route Guards

### Supabase client files

- `lib/supabase/server.ts` — server-side client (reads cookies; for middleware + server components)
- `lib/supabase/client.ts` — browser client (already exists)
- `lib/supabase/middleware.ts` — helper that refreshes session on each request

### `middleware.ts` routing logic

```
Request
  ├── Public (/login, /signup, /auth/callback, /, /shops/*)
  │     └── Pass through; refresh session if exists
  ├── /onboarding/consent
  │     └── Requires valid session → /login if not
  └── Protected (/search, /lists/*, /profile, /settings, /checkins/*)
        ├── No session         → /login?returnTo=<current>
        ├── No PDPA consent    → /onboarding/consent
        └── Session + consent  → pass through
```

### PDPA consent detection in middleware

Use a **custom JWT claim** (`pdpa_consented: boolean`) injected by a Supabase PostgreSQL hook on `profiles` insert/update. Middleware reads this from the session token — no extra network call per request.

See ADR: [2026-02-25-pdpa-jwt-claim.md](../decisions/2026-02-25-pdpa-jwt-claim.md)

### JWT forwarding to Python backend

Each Next.js API proxy route extracts the session token and forwards it:

```typescript
const { data: { session } } = await supabase.auth.getSession()
// Forward as: Authorization: Bearer <session.access_token>
```

---

## LINE Login Configuration

LINE Login does not have a native Supabase provider. Configure as a **custom OIDC provider** in Supabase dashboard:

- Discovery URL: `https://access.line.me/.well-known/openid-configuration`
- Scopes: `openid profile email`
- LINE Developer Console: register app, get Client ID + Secret, set callback URL to Supabase Auth callback

See ADR: [2026-02-25-line-login-oidc.md](../decisions/2026-02-25-line-login-oidc.md)

---

## Testing Strategy

### Backend (`backend/tests/api/test_auth.py` — extend existing)

- `POST /auth/consent`: valid JWT sets timestamp; idempotent; invalid JWT → 401
- `DELETE /auth/account`: sets `deletion_requested_at`; unauthenticated → 401
- `POST /auth/cancel-deletion`: clears timestamp; 404 if no deletion pending
- Account deletion scheduler: mock expired profiles; verify Storage cleanup + `admin.deleteUser()` called

### Frontend (`app/(auth)/__tests__/`) — Vitest + Testing Library

- Signup form: PDPA checkbox blocks submission; enables on check
- Login form: error on bad credentials; redirect on success
- Consent page: confirm button disabled until checked; calls `/auth/consent`
- Auth callback: calls `exchangeCodeForSession`; new users → consent; existing → app

### Integration (`backend/tests/integration/`)

- Full lifecycle: signup → consent → use protected API → request deletion → simulate 30 days → run scheduler → verify all DB rows + Storage objects gone

### RLS policy tests (`backend/tests/db/test_rls.py`)

- User A cannot read User B's lists, check-ins, stamps
- User can read/write own data
- Unauthenticated request on public tables returns empty (not 401)

---

## Components to Build

### Frontend

| Component | Path |
|-----------|------|
| Login page | `app/(auth)/login/page.tsx` |
| Signup page | `app/(auth)/signup/page.tsx` |
| Auth callback page | `app/auth/callback/page.tsx` |
| PDPA consent page | `app/onboarding/consent/page.tsx` |
| Account recovery page | `app/account/recover/page.tsx` |
| Settings page | `app/(protected)/settings/page.tsx` |
| Middleware | `middleware.ts` |
| Supabase server client | `lib/supabase/server.ts` |
| Supabase middleware helper | `lib/supabase/middleware.ts` |

### Backend

| Component | Path |
|-----------|------|
| Auth routes | `backend/api/auth.py` |
| Account deletion handler | `backend/workers/handlers/account_deletion.py` |
| APScheduler registration | Update `backend/workers/scheduler.py` |

### Database

| Migration | Description |
|-----------|-------------|
| Add `deletion_requested_at` to profiles | Schema change |
| Supabase Auth hook for custom JWT claim | PostgreSQL function + hook config |
