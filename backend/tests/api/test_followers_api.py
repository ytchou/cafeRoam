"""Tests for shop follower API endpoints."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_admin_db, get_current_user, get_optional_user, get_user_db
from main import app
from models.types import (
    FollowedShopSummary,
    FollowerCountResponse,
    FollowingListResponse,
    FollowResponse,
)

client = TestClient(app)

_AUTH_USER = {"id": "user-a1b2c3", "email": "lin.mei@gmail.com"}


def _override_auth():
    app.dependency_overrides[get_current_user] = lambda: _AUTH_USER
    app.dependency_overrides[get_user_db] = lambda: MagicMock()


def _override_optional_auth(user=_AUTH_USER):
    app.dependency_overrides[get_optional_user] = lambda: user


def _override_admin_db():
    app.dependency_overrides[get_admin_db] = lambda: MagicMock()


def _clear_overrides():
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_user_db, None)
    app.dependency_overrides.pop(get_optional_user, None)
    app.dependency_overrides.pop(get_admin_db, None)


class TestFollowShop:
    """When a user taps the heart icon to follow a shop."""

    def test_returns_401_when_not_authenticated(self):
        response = client.post("/shops/shop-d4e5f6/follow")
        assert response.status_code == 401

    def test_returns_200_with_follow_response(self):
        _override_auth()
        try:
            with patch("api.followers.FollowerService") as mock_cls:
                mock_cls.return_value.follow.return_value = FollowResponse(
                    following=True, follower_count=5, visible=False
                )
                response = client.post("/shops/shop-d4e5f6/follow")

            assert response.status_code == 200
            data = response.json()
            assert data["following"] is True
            assert data["followerCount"] == 5
        finally:
            _clear_overrides()

    def test_returns_404_for_nonexistent_shop(self):
        _override_auth()
        try:
            with patch("api.followers.FollowerService") as mock_cls:
                mock_cls.return_value.follow.side_effect = ValueError("Shop not found: bad-id")
                response = client.post("/shops/bad-id/follow")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()
        finally:
            _clear_overrides()


class TestUnfollowShop:
    """When a user taps the filled heart to unfollow."""

    def test_returns_401_when_not_authenticated(self):
        response = client.delete("/shops/shop-d4e5f6/follow")
        assert response.status_code == 401

    def test_returns_200_with_unfollow_response(self):
        _override_auth()
        try:
            with patch("api.followers.FollowerService") as mock_cls:
                mock_cls.return_value.unfollow.return_value = FollowResponse(
                    following=False, follower_count=4, visible=False
                )
                response = client.delete("/shops/shop-d4e5f6/follow")

            assert response.status_code == 200
            data = response.json()
            assert data["following"] is False
            assert data["followerCount"] == 4
        finally:
            _clear_overrides()


class TestGetFollowerCount:
    """When a shop detail page loads and fetches the follower count."""

    def test_returns_count_for_unauthenticated_user(self):
        _override_optional_auth(user=None)
        _override_admin_db()
        try:
            with patch("api.followers.FollowerService") as mock_cls:
                mock_cls.return_value.get_follower_count.return_value = FollowerCountResponse(
                    count=42, visible=True, is_following=None
                )
                response = client.get("/shops/shop-d4e5f6/followers/count")

            assert response.status_code == 200
            data = response.json()
            assert data["count"] == 42
            assert data["visible"] is True
            assert data["isFollowing"] is None
        finally:
            _clear_overrides()

    def test_returns_is_following_for_authenticated_user(self):
        _override_auth()
        _override_optional_auth()
        _override_admin_db()
        try:
            with patch("api.followers.FollowerService") as mock_cls:
                mock_cls.return_value.get_follower_count.return_value = FollowerCountResponse(
                    count=15, visible=True, is_following=True
                )
                response = client.get("/shops/shop-d4e5f6/followers/count")

            assert response.status_code == 200
            data = response.json()
            assert data["isFollowing"] is True
        finally:
            _clear_overrides()


class TestGetFollowing:
    """When a user views their Following section on the profile page."""

    def test_returns_401_when_not_authenticated(self):
        response = client.get("/me/following")
        assert response.status_code == 401

    def test_returns_paginated_following_list(self):
        _override_auth()
        try:
            with patch("api.followers.FollowerService") as mock_cls:
                mock_cls.return_value.get_following.return_value = FollowingListResponse(
                    shops=[
                        FollowedShopSummary(
                            id="shop-d4e5f6",
                            name="山小孩咖啡",
                            address="台北市大安區溫州街74巷5弄2號",
                            slug="mountain-kid-coffee",
                            mrt="台電大樓",
                            followed_at="2026-03-20T10:00:00",
                        )
                    ],
                    total=1,
                    page=1,
                    limit=20,
                    has_more=False,
                )
                response = client.get("/me/following?page=1&limit=20")

            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["shops"]) == 1
            assert data["shops"][0]["name"] == "山小孩咖啡"
        finally:
            _clear_overrides()
