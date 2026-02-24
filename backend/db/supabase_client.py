from functools import lru_cache

from supabase import Client, create_client

from core.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Get Supabase client using anon key (respects RLS)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache(maxsize=1)
def get_service_role_client() -> Client:
    """Get Supabase client using service role key (bypasses RLS).
    Use only for worker processes and admin operations."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
