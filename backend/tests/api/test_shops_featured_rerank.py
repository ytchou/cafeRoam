# backend/tests/api/test_shops_featured_rerank.py
#
# Strategy: mock at system boundaries only.
# - _fetch_featured_shops is a designed DB-isolation seam — patching it is intentional.
# - get_service_role_client is mocked at the DB boundary so ProfileService reads from
#   a stub client rather than real Supabase.
# - get_optional_current_user is patched via its module-import name because the handler
#   calls it directly (not via Depends) to preserve patch() compatibility in tests.
#   See handoff note: "intentional pattern — do not change to Depends".
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def _shop(id_, work, rest, social):
    return {
        "id": id_,
        "name": f"Shop {id_}",
        "slug": f"shop-{id_}",
        "address": "台北市大安區和平東路一段",
        "city": "taipei",
        "mrt": None,
        "latitude": 25.0,
        "longitude": 121.5,
        "rating": 4.5,
        "review_count": 10,
        "description": "",
        "processing_status": "live",
        "mode_work": work,
        "mode_rest": rest,
        "mode_social": social,
        "community_summary": None,
        "opening_hours": None,
        "payment_methods": None,
        "created_at": "2026-01-01T00:00:00Z",
        "shop_photos": [],
        "shop_claims": [],
        "shop_tags": [],
    }


SHOPS = [
    _shop("a", work=0.2, rest=0.9, social=0.1),  # rest leader
    _shop("b", work=0.9, rest=0.1, social=0.2),  # work leader
    _shop("c", work=0.1, rest=0.2, social=0.9),  # social leader
]


def _stub_service_role_client(preferred_modes):
    """Return a minimal MagicMock supabase service-role client.

    Only stubs the profiles table select chain used by ProfileService.get_preferred_modes.
    """
    db = MagicMock()
    profiles_table = MagicMock()
    profiles_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = (
        {"preferred_modes": preferred_modes} if preferred_modes is not None else None
    )
    db.table.return_value = profiles_table
    return db


class TestFeaturedUnauthenticated:
    def test_unauthenticated_user_sees_insertion_order(self, client):
        with patch("api.shops._fetch_featured_shops", return_value=SHOPS):
            res = client.get("/shops?featured=true")
        assert res.status_code == 200
        ids = [s["id"] for s in res.json()]
        assert ids == ["a", "b", "c"]


class TestFeaturedAuthenticatedNoPreferences:
    def test_authenticated_user_with_no_preferences_sees_insertion_order(self, client):
        fake_user = {"id": "user-abc-001", "app_metadata": {}}
        stub_db = _stub_service_role_client(preferred_modes=None)
        with (
            patch("api.shops.get_optional_current_user", return_value=fake_user),
            patch("api.shops._fetch_featured_shops", return_value=SHOPS),
            patch("api.shops.get_service_role_client", return_value=stub_db),
        ):
            res = client.get(
                "/shops?featured=true",
                headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.test"},
            )
        ids = [s["id"] for s in res.json()]
        assert ids == ["a", "b", "c"]


class TestFeaturedAuthenticatedWorkPreference:
    def test_work_preference_ranks_work_leader_first(self, client):
        fake_user = {"id": "user-abc-002", "app_metadata": {}}
        stub_db = _stub_service_role_client(preferred_modes=["work"])
        with (
            patch("api.shops.get_optional_current_user", return_value=fake_user),
            patch("api.shops._fetch_featured_shops", return_value=SHOPS),
            patch("api.shops.get_service_role_client", return_value=stub_db),
        ):
            res = client.get(
                "/shops?featured=true",
                headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.test"},
            )
        ids = [s["id"] for s in res.json()]
        assert ids[0] == "b"  # work leader first


class TestFeaturedAuthenticatedMultiMode:
    def test_rest_and_social_preference_ranks_both_leaders_before_work_shop(self, client):
        fake_user = {"id": "user-abc-003", "app_metadata": {}}
        stub_db = _stub_service_role_client(preferred_modes=["rest", "social"])
        with (
            patch("api.shops.get_optional_current_user", return_value=fake_user),
            patch("api.shops._fetch_featured_shops", return_value=SHOPS),
            patch("api.shops.get_service_role_client", return_value=stub_db),
        ):
            res = client.get(
                "/shops?featured=true",
                headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.test"},
            )
        ids = [s["id"] for s in res.json()]
        # a (rest=0.9) and c (social=0.9) are tied at 0.9 — both before b (max 0.2)
        assert ids[:2] == ["a", "c"] or ids[:2] == ["c", "a"]
        assert ids[2] == "b"
