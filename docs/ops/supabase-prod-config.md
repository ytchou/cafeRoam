# Supabase Production Configuration

Notes on what to configure in the Supabase dashboard when standing up the production project.
The `supabase/config.toml` file controls **local dev tooling only** — it has no effect on the
hosted prod project. Production settings live in the Supabase dashboard.

---

## Auth Settings (Dashboard → Authentication → URL Configuration)

| Setting | Local (config.toml) | Production |
|---------|--------------------|-|
| Site URL | `http://localhost:3000` | `https://caferoam.tw` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://caferoam.tw/auth/callback` |

**How to update:**
1. Go to your prod project in [app.supabase.com](https://app.supabase.com)
2. Navigate to **Authentication → URL Configuration**
3. Set **Site URL** to `https://caferoam.tw`
4. Add `https://caferoam.tw/auth/callback` to **Redirect URLs**
5. Save changes

## OAuth Providers (if configured)

For any OAuth provider (e.g., Google):
- Update the **Authorized redirect URI** in the provider's console to:
  `https://<your-prod-project-ref>.supabase.co/auth/v1/callback`
- The prod Supabase project ref is different from staging — get it from the dashboard URL.

## Custom Access Token Hook

The `custom_access_token_hook` is configured in `config.toml` for local dev. On the hosted
prod project, enable it in:

**Dashboard → Authentication → Hooks**
- Enable **Custom Access Token** hook
- Set URI to: `pg-functions://postgres/public/custom_access_token_hook`

This hook adds custom claims to JWTs. It must be enabled in prod or the backend's role-based
auth checks will fail silently.

## Email

By default Supabase uses their built-in SMTP (limited to 3 emails/hour on free tier). For
production:
- Configure a custom SMTP provider under **Authentication → Email Templates → SMTP Settings**
- CafeRoam uses Resend (`RESEND_API_KEY`). Use Resend's SMTP relay or their Supabase integration.
- From address must match `EMAIL_FROM=hello@caferoam.tw` in Railway env vars.

## RLS Policies

All user-facing tables already have RLS policies (enforced in migrations). Verify with:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

The result should be empty (or only contain non-user-facing tables like `taxonomy_tags`).

## Applying Migrations to Production

```bash
# Link CLI to the prod project
supabase link --project-ref <prod-project-ref>

# Preview what will run (always do this first)
supabase db diff --linked

# Apply
supabase db push
```

Never use `supabase db reset` on production — it wipes all data.
