-- supabase_auth_admin needs SELECT on profiles to execute the custom_access_token_hook.
-- The hook queries pdpa_consent_at and deletion_requested_at to inject JWT claims.
GRANT SELECT ON public.profiles TO supabase_auth_admin;
