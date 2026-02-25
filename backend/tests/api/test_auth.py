from unittest.mock import MagicMock, patch

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user, get_optional_user

# Create a test app with auth-protected routes
app = FastAPI()


@app.get("/protected")
async def protected_route(user=Depends(get_current_user)):  # noqa: B008
    return {"user_id": user["id"]}


@app.get("/public")
async def public_route(user=Depends(get_optional_user)):  # noqa: B008
    return {"user_id": user["id"] if user else None}


client = TestClient(app)


class TestAuth:
    def test_protected_route_rejects_missing_token(self):
        response = client.get("/protected")
        assert response.status_code == 401

    def test_protected_route_rejects_invalid_token(self):
        with patch("api.deps.get_user_client") as mock_sb:
            mock_client = MagicMock()
            mock_client.auth.get_user = MagicMock(side_effect=Exception("Invalid token"))
            mock_sb.return_value = mock_client
            response = client.get("/protected", headers={"Authorization": "Bearer invalid"})
            assert response.status_code == 401

    def test_protected_route_accepts_valid_token(self):
        with patch("api.deps.get_user_client") as mock_sb:
            mock_client = MagicMock()
            mock_client.auth.get_user = MagicMock(
                return_value=MagicMock(user=MagicMock(id="user-1", email="test@example.com"))
            )
            mock_sb.return_value = mock_client
            response = client.get("/protected", headers={"Authorization": "Bearer valid-jwt"})
            assert response.status_code == 200
            assert response.json()["user_id"] == "user-1"

    def test_public_route_allows_unauthenticated(self):
        response = client.get("/public")
        assert response.status_code == 200
        assert response.json()["user_id"] is None


class TestGetUserDb:
    def test_get_user_db_returns_client_for_valid_token(self):
        """get_user_db should create a per-request client with the user's JWT."""
        from api.deps import get_user_db

        test_app = FastAPI()

        @test_app.get("/db-test")
        async def db_test_route(db=Depends(get_user_db)):  # noqa: B008
            return {"has_db": db is not None}

        test_client = TestClient(test_app)
        with patch("api.deps.get_user_client") as mock_get_client:
            mock_get_client.return_value = MagicMock()
            response = test_client.get(
                "/db-test",
                headers={"Authorization": "Bearer valid-jwt"},
            )
            assert response.status_code == 200
            mock_get_client.assert_called_once_with("valid-jwt")

    def test_get_user_db_raises_401_without_token(self):
        """get_user_db should raise 401 when no Authorization header."""
        from api.deps import get_user_db

        test_app = FastAPI()

        @test_app.get("/db-test")
        async def db_test_route(db=Depends(get_user_db)):  # noqa: B008
            return {"has_db": True}

        test_client = TestClient(test_app)
        response = test_client.get("/db-test")
        assert response.status_code == 401
