from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}


def make_db_mock(rows: list) -> MagicMock:
    """Return a Supabase client mock whose execute().data returns rows.

    Centralises the mock chain so tests don't repeat it inline. Note: the
    chain (table→select→eq→order→execute) is still encoded here, so adding
    or reordering query-builder calls in production code requires updating
    this fixture.
    """
    db = MagicMock()
    execute_result = MagicMock()
    execute_result.data = rows
    db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = execute_result
    return db


class TestGetStamps:
    def test_authenticated_user_sees_cafe_name_on_their_stamp(
        self, client: TestClient, auth_headers: dict
    ):
        db = make_db_mock(
            [
                {
                    "id": "stamp-1",
                    "user_id": "user-123",
                    "shop_id": "shop-a",
                    "check_in_id": "ci-1",
                    "design_url": "/stamps/shop-a.svg",
                    "earned_at": "2026-03-01T00:00:00Z",
                    "shops": {"name": "Fika Coffee"},
                }
            ]
        )

        app.dependency_overrides[get_current_user] = lambda: {"id": "user-123"}
        app.dependency_overrides[get_user_db] = lambda: db

        try:
            resp = client.get("/stamps", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data[0]["shop_name"] == "Fika Coffee"
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_user_db, None)

    def test_authenticated_user_sees_photo_and_district_on_their_stamp(
        self, client: TestClient, auth_headers: dict
    ):
        db = make_db_mock(
            [
                {
                    "id": "stamp-1",
                    "user_id": "user-123",
                    "shop_id": "shop-a",
                    "check_in_id": "ci-1",
                    "design_url": "/stamps/shop-a.svg",
                    "earned_at": "2026-03-01T00:00:00Z",
                    "shops": {"name": "Fika Coffee", "district": "大安"},
                    "check_ins": {
                        "photo_urls": ["https://storage.example.com/photo1.jpg"],
                        "note": None,
                    },
                }
            ]
        )

        app.dependency_overrides[get_current_user] = lambda: {"id": "user-123"}
        app.dependency_overrides[get_user_db] = lambda: db

        try:
            resp = client.get("/stamps", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data[0]["photo_url"] == "https://storage.example.com/photo1.jpg"
            assert data[0]["district"] == "大安"
            assert data[0]["diary_note"] is None
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_user_db, None)
