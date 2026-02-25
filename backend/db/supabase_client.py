from functools import lru_cache

from supabase import Client, ClientOptions, create_client

from core.config import settings


def get_user_client(token: str) -> Client:
    """Create a per-request Supabase client authenticated with the user's JWT.

    This makes auth.uid() available in RLS policies, so Postgres can enforce
    row-level ownership checks without application-level verification.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
    )


@lru_cache(maxsize=1)
def get_anon_client() -> Client:
    """Get Supabase client using the anon key. Respects RLS policies.
    Use for public-facing endpoints that don't require authentication."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache(maxsize=1)
def get_service_role_client() -> Client:
    """Get Supabase client using service role key (bypasses RLS).
    Use only for worker processes and admin operations."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
