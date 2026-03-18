"""Tests for Community Notes API endpoints."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app
from models.types import CommunityFeedResponse, CommunityNoteAuthor, CommunityNoteCard

client = TestClient(app)

_MOCK_CARD = CommunityNoteCard(
    checkin_id="ci-1",
    author=CommunityNoteAuthor(
        user_id="user-a1b2c3",
        display_name="Mei-Ling ☕",
        avatar_url=None,
        role_label="Coffee blogger",
    ),
    review_text="Hinoki Coffee has the most incredible natural light.",
    star_rating=5,
    cover_photo_url="https://example.com/photo1.jpg",
    shop_name="Hinoki Coffee",
    shop_slug="hinoki-coffee",
    shop_district="大安",
    like_count=12,
    created_at="2026-03-15T14:30:00",
)


class TestCommunityPreview:
    """When the Explore page loads, it fetches the community preview."""

    def test_returns_200_with_preview_cards(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.CommunityService") as mock_cls,
        ):
            mock_cls.return_value.get_preview.return_value = [_MOCK_CARD]
            response = client.get("/explore/community/preview")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["checkinId"] == "ci-1"
        assert data[0]["author"]["displayName"] == "Mei-Ling ☕"

    def test_is_public_no_auth_required(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.CommunityService") as mock_cls,
        ):
            mock_cls.return_value.get_preview.return_value = []
            response = client.get("/explore/community/preview")

        assert response.status_code == 200

    def test_returns_empty_list_when_no_notes(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.CommunityService") as mock_cls,
        ):
            mock_cls.return_value.get_preview.return_value = []
            response = client.get("/explore/community/preview")

        assert response.json() == []


class TestCommunityFeed:
    """When a user opens the full community page, they get paginated results."""

    def test_returns_200_with_feed_and_cursor(self):
        feed = CommunityFeedResponse(
            notes=[_MOCK_CARD],
            next_cursor="2026-03-14T10:00:00",
        )
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.CommunityService") as mock_cls,
        ):
            mock_cls.return_value.get_feed.return_value = feed
            response = client.get("/explore/community")

        assert response.status_code == 200
        data = response.json()
        assert data["nextCursor"] == "2026-03-14T10:00:00"
        assert len(data["notes"]) == 1

    def test_passes_cursor_and_limit_to_service(self):
        feed = CommunityFeedResponse(notes=[], next_cursor=None)
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.CommunityService") as mock_cls,
        ):
            mock_cls.return_value.get_feed.return_value = feed
            client.get("/explore/community?cursor=2026-03-14T10:00:00&limit=5")
            mock_cls.return_value.get_feed.assert_called_once_with(
                cursor="2026-03-14T10:00:00",
                limit=5,
            )


class TestCommunityLikeToggle:
    """When an authenticated user taps heart, their like toggles."""

    def test_returns_401_when_not_authenticated(self):
        response = client.post("/explore/community/ci-1/like")
        assert response.status_code == 401

    def test_returns_200_with_like_count_when_authenticated(self):
        app.dependency_overrides[get_current_user] = lambda: {
            "id": "user-a1b2c3",
            "email": "test@example.com",
        }
        try:
            with (
                patch("api.explore.get_service_role_client", return_value=MagicMock()),
                patch("api.explore.CommunityService") as mock_cls,
            ):
                mock_cls.return_value.toggle_like.return_value = 13
                response = client.post("/explore/community/ci-1/like")

            assert response.status_code == 200
            assert response.json()["likeCount"] == 13
        finally:
            app.dependency_overrides.pop(get_current_user, None)


class TestCommunityLikeCheck:
    """When the feed loads, check if the current user has liked each note."""

    def test_returns_401_when_not_authenticated(self):
        response = client.get("/explore/community/ci-1/like")
        assert response.status_code == 401

    def test_returns_liked_status_when_authenticated(self):
        app.dependency_overrides[get_current_user] = lambda: {
            "id": "user-a1b2c3",
            "email": "test@example.com",
        }
        try:
            with (
                patch("api.explore.get_service_role_client", return_value=MagicMock()),
                patch("api.explore.CommunityService") as mock_cls,
            ):
                mock_cls.return_value.is_liked.return_value = True
                response = client.get("/explore/community/ci-1/like")

            assert response.status_code == 200
            assert response.json()["liked"] is True
        finally:
            app.dependency_overrides.pop(get_current_user, None)
