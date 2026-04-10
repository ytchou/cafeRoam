# backend/tests/api/test_shops_featured_rerank.py
from unittest.mock import AsyncMock, patch

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
        "address": "台北市",
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


class TestFeaturedUnauthenticated:
    def test_preserves_insertion_order(self, client):
        with patch("api.shops._fetch_featured_shops", return_value=SHOPS):
            res = client.get("/shops?featured=true")
        assert res.status_code == 200
        ids = [s["id"] for s in res.json()]
        assert ids == ["a", "b", "c"]


class TestFeaturedAuthenticatedNoPreferences:
    def test_same_as_unauthenticated(self, client):
        fake_user = {"id": "user-1", "app_metadata": {}}
        with (
            patch("api.shops.get_optional_current_user", return_value=fake_user),
            patch("api.shops._fetch_featured_shops", return_value=SHOPS),
            patch("api.shops.ProfileService") as svc_cls,
        ):
            svc_cls.return_value.get_preferred_modes = AsyncMock(return_value=None)
            res = client.get(
                "/shops?featured=true",
                headers={"Authorization": "Bearer x"},
            )
        ids = [s["id"] for s in res.json()]
        assert ids == ["a", "b", "c"]


class TestFeaturedAuthenticatedWorkPreference:
    def test_work_preference_ranks_work_leader_first(self, client):
        fake_user = {"id": "user-1", "app_metadata": {}}
        with (
            patch("api.shops.get_optional_current_user", return_value=fake_user),
            patch("api.shops._fetch_featured_shops", return_value=SHOPS),
            patch("api.shops.ProfileService") as svc_cls,
        ):
            svc_cls.return_value.get_preferred_modes = AsyncMock(return_value=["work"])
            res = client.get(
                "/shops?featured=true",
                headers={"Authorization": "Bearer x"},
            )
        ids = [s["id"] for s in res.json()]
        assert ids[0] == "b"  # work leader first


class TestFeaturedAuthenticatedMultiMode:
    def test_greatest_across_rest_and_social(self, client):
        fake_user = {"id": "user-1", "app_metadata": {}}
        with (
            patch("api.shops.get_optional_current_user", return_value=fake_user),
            patch("api.shops._fetch_featured_shops", return_value=SHOPS),
            patch("api.shops.ProfileService") as svc_cls,
        ):
            svc_cls.return_value.get_preferred_modes = AsyncMock(
                return_value=["rest", "social"],
            )
            res = client.get(
                "/shops?featured=true",
                headers={"Authorization": "Bearer x"},
            )
        ids = [s["id"] for s in res.json()]
        # a (rest=0.9) and c (social=0.9) are tied at 0.9 — both before b (0.2)
        assert ids[:2] == ["a", "c"] or ids[:2] == ["c", "a"]
        assert ids[2] == "b"
