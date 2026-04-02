"""Tests for admin roles endpoints."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_admin_db, get_current_user
from main import app

client = TestClient(app)

_ADMIN_ID = "a7f3c2e1-4b58-4d9a-8c6e-123456789abc"


def _admin_user() -> dict:
    return {"id": _ADMIN_ID}


class TestGrantRole:
    """When an admin grants a blogger role, the user becomes a partner."""

    def test_grants_a_role_to_a_target_user(self):
        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "role-new",
                    "user_id": "user-target",
                    "role": "blogger",
                    "granted_at": "2026-03-18T10:00:00",
                    "granted_by": _ADMIN_ID,
                }
            ]
        )
        app.dependency_overrides[get_current_user] = _admin_user
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/roles",
                    json={"user_id": "user-target", "role": "blogger"},
                )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 201
        assert response.json()["role"] == "blogger"

    def test_returns_401_when_not_authenticated(self):
        response = client.post(
            "/admin/roles",
            json={"user_id": "user-target", "role": "blogger"},
        )
        assert response.status_code in (401, 403)

    def test_returns_403_when_non_admin_user_attempts_to_grant(self):
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "regular-user-not-admin"}
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/roles",
                    json={"user_id": "user-target", "role": "blogger"},
                )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 403

    def test_rejects_grant_with_invalid_role_name(self):
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = _admin_user
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/roles",
                    json={"user_id": "user-target", "role": "superuser"},
                )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 400


class TestRevokeRole:
    """When an admin revokes a role, the user loses that permission."""

    def test_revokes_a_role_from_a_target_user(self):
        mock_db = MagicMock()
        mock_db.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "role-1"}]
        )
        app.dependency_overrides[get_current_user] = _admin_user
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.delete("/admin/roles/user-target/blogger")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200

    def test_returns_error_when_role_not_assigned_to_user(self):
        mock_db = MagicMock()
        mock_db.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        app.dependency_overrides[get_current_user] = _admin_user
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.delete("/admin/roles/user-target/blogger")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 404


class TestListRoles:
    """When an admin views roles, they see all granted permissions."""

    def test_returns_all_roles(self):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.order.return_value.execute.return_value = (
            MagicMock(
                data=[
                    {
                        "id": "r1",
                        "user_id": "u1",
                        "role": "blogger",
                        "granted_at": "2026-03-18T10:00:00",
                        "granted_by": _ADMIN_ID,
                        "auth_users": {"email": "coffee.blogger@example.com"},
                    },
                ]
            )
        )
        app.dependency_overrides[get_current_user] = _admin_user
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/roles")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["email"] == "coffee.blogger@example.com"
        assert "auth_users" not in data[0]

    def test_filters_by_role_when_query_param_provided(self):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.order.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "r2",
                    "user_id": "u2",
                    "role": "member",
                    "granted_at": "2026-03-18T11:00:00",
                    "granted_by": _ADMIN_ID,
                    "auth_users": {"email": "member.user@example.com"},
                },
            ]
        )
        app.dependency_overrides[get_current_user] = _admin_user
        app.dependency_overrides[get_admin_db] = lambda: mock_db
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/roles?role=member")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["role"] == "member"
        assert data[0]["email"] == "member.user@example.com"
