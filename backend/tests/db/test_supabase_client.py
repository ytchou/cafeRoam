from unittest.mock import patch

from db.supabase_client import get_service_role_client, get_user_client


class TestSupabaseClient:
    def test_get_user_client_creates_client_with_token(self):
        """Per-request client must be created with the user's JWT."""
        with patch("db.supabase_client.create_client") as mock_create, \
             patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_anon_key = "test-anon-key"
            get_user_client("user-jwt-token")
            mock_create.assert_called_once()
            # Verify the token is passed via options keyword arg
            _, kwargs = mock_create.call_args
            assert "options" in kwargs
            assert "Authorization" in kwargs["options"].headers

    def test_get_user_client_is_not_cached(self):
        """Each call must return a fresh client (not singleton)."""
        with patch("db.supabase_client.create_client") as mock_create, \
             patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_anon_key = "test-anon-key"
            mock_create.return_value = "client-1"
            get_user_client("token-1")
            mock_create.return_value = "client-2"
            get_user_client("token-2")
            assert mock_create.call_count == 2

    def test_get_service_role_client_returns_client(self):
        with patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_service_role_key = "test-service-key"
            client = get_service_role_client()
            assert client is not None

    def test_service_role_client_is_singleton(self):
        with patch("db.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "http://localhost:54321"
            mock_settings.supabase_service_role_key = "test-service-key"
            c1 = get_service_role_client()
            c2 = get_service_role_client()
            assert c1 is c2
