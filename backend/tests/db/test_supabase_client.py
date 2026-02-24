from unittest.mock import patch

from db.supabase_client import get_service_role_client, get_supabase_client


class TestSupabaseClient:
    def test_get_supabase_client_returns_client(self):
        with patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_anon_key = "test-anon-key"
            client = get_supabase_client()
            assert client is not None

    def test_get_service_role_client_returns_client(self):
        with patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_service_role_key = "test-service-key"
            client = get_service_role_client()
            assert client is not None

    def test_clients_are_singletons(self):
        """Same settings should return cached clients."""
        with patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_anon_key = "test-anon-key"
            c1 = get_supabase_client()
            c2 = get_supabase_client()
            assert c1 is c2
