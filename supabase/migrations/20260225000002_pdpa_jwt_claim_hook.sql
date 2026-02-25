-- Custom JWT claims hook: inject pdpa_consented + deletion status into JWT
-- Supabase Auth calls this function when minting access tokens.
-- Configure in Supabase Dashboard > Auth > Hooks > Custom Access Token.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  claims JSONB;
  user_id UUID;
  consent_at TIMESTAMPTZ;
  deletion_at TIMESTAMPTZ;
BEGIN
  user_id := (event->>'user_id')::UUID;
  claims := event->'claims';

  -- Look up profile
  SELECT pdpa_consent_at, deletion_requested_at
  INTO consent_at, deletion_at
  FROM public.profiles
  WHERE id = user_id;

  -- Inject custom claims into app_metadata
  claims := jsonb_set(
    claims,
    '{app_metadata, pdpa_consented}',
    to_jsonb(consent_at IS NOT NULL)
  );
  claims := jsonb_set(
    claims,
    '{app_metadata, deletion_requested}',
    to_jsonb(deletion_at IS NOT NULL)
  );

  -- Return modified event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required for Auth hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
