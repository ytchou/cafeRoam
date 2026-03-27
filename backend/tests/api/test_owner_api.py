import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from api.deps import get_current_user, require_shop_owner, get_admin_db


SHOP_ID = "550e8400-e29b-41d4-a716-446655440000"
OWNER = {"id": "owner-uuid"}


@pytest.fixture
def auth_client():
    """Test client authenticated as a verified shop owner."""
    app.dependency_overrides[get_current_user] = lambda: OWNER
    app.dependency_overrides[require_shop_owner] = lambda shop_id: OWNER
    app.dependency_overrides[get_admin_db] = lambda: MagicMock()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client():
    """Test client with no auth — dependency overrides cleared."""
    app.dependency_overrides.clear()
    yield TestClient(app)


class TestDashboardEndpoints:
    def test_get_dashboard_requires_auth(self, unauth_client):
        """Unauthenticated request to owner dashboard returns 401"""
        resp = unauth_client.get(f"/owner/{SHOP_ID}/dashboard")
        assert resp.status_code == 401

    def test_get_dashboard_returns_stats(self, auth_client):
        """Verified owner gets dashboard stats for their shop"""
        mock_stats = MagicMock()
        mock_stats.model_dump.return_value = {
            "checkin_count_30d": 15,
            "follower_count": 47,
            "saves_count_30d": 8,
            "page_views_30d": 230,
        }
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.get_dashboard_stats.return_value = mock_stats
            resp = auth_client.get(f"/owner/{SHOP_ID}/dashboard")

        assert resp.status_code == 200
        data = resp.json()
        assert data["checkin_count_30d"] == 15
        assert data["follower_count"] == 47

    def test_get_dashboard_with_wrong_shop_returns_403(self):
        """Non-owner cannot access another shop's dashboard"""
        def _raise_403(shop_id: str):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Not the verified owner of this shop")

        app.dependency_overrides[get_current_user] = lambda: OWNER
        app.dependency_overrides[require_shop_owner] = _raise_403
        app.dependency_overrides[get_admin_db] = lambda: MagicMock()
        client = TestClient(app)

        resp = client.get(f"/owner/{SHOP_ID}/dashboard")
        app.dependency_overrides.clear()

        assert resp.status_code == 403


class TestAnalyticsEndpoints:
    def test_get_analytics_requires_auth(self, unauth_client):
        """Unauthenticated request to analytics returns 401"""
        resp = unauth_client.get(f"/owner/{SHOP_ID}/analytics")
        assert resp.status_code == 401

    def test_get_analytics_returns_all_sections(self, auth_client):
        """Verified owner receives search insights, community pulse, and district rankings"""
        mock_insight = MagicMock()
        mock_insight.model_dump.return_value = {"query": "安靜咖啡廳", "impressions": 42}
        mock_pulse = MagicMock()
        mock_pulse.model_dump.return_value = {"tag": "安靜", "count": 18}
        mock_ranking = MagicMock()
        mock_ranking.model_dump.return_value = {"attribute": "work_score", "rank": 3, "total_in_district": 24}

        with patch("api.owner.OwnerService") as MockSvc:
            svc_instance = MockSvc.return_value
            svc_instance.get_search_insights.return_value = [mock_insight]
            svc_instance.get_community_pulse.return_value = [mock_pulse]
            svc_instance.get_ranking.return_value = [mock_ranking]
            resp = auth_client.get(f"/owner/{SHOP_ID}/analytics")

        assert resp.status_code == 200
        data = resp.json()
        assert "search_insights" in data
        assert "community_pulse" in data
        assert "district_rankings" in data
        assert data["search_insights"][0]["query"] == "安靜咖啡廳"


class TestStoryEndpoints:
    def test_get_story_returns_none_when_no_story_exists(self, auth_client):
        """Owner with no published story receives null response"""
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.get_shop_story.return_value = None
            resp = auth_client.get(f"/owner/{SHOP_ID}/story")

        assert resp.status_code == 200
        assert resp.json() is None

    def test_get_story_returns_existing_story(self, auth_client):
        """Owner with a published story can retrieve it"""
        mock_story = MagicMock()
        mock_story.model_dump.return_value = {
            "id": "story-uuid",
            "shop_id": SHOP_ID,
            "title": "Our Story",
            "body": "從大稻埕起步的故事。",
            "photo_url": None,
            "is_published": True,
            "created_at": "2026-03-27T00:00:00Z",
            "updated_at": "2026-03-27T00:00:00Z",
        }
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.get_shop_story.return_value = mock_story
            resp = auth_client.get(f"/owner/{SHOP_ID}/story")

        assert resp.status_code == 200
        assert resp.json()["title"] == "Our Story"

    def test_put_story_saves_and_returns_story(self, auth_client):
        """Owner publishes a story; endpoint persists and returns it"""
        mock_story = MagicMock()
        mock_story.model_dump.return_value = {
            "id": "content-uuid",
            "shop_id": SHOP_ID,
            "title": "Our Story",
            "body": "從大稻埕起步的故事。",
            "photo_url": None,
            "is_published": True,
            "created_at": "2026-03-27T00:00:00Z",
            "updated_at": "2026-03-27T00:00:00Z",
        }
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.upsert_shop_story.return_value = mock_story
            resp = auth_client.put(
                f"/owner/{SHOP_ID}/story",
                json={"body": "從大稻埕起步的故事。", "is_published": True},
            )

        assert resp.status_code == 200
        assert resp.json()["is_published"] is True

    def test_put_story_requires_auth(self, unauth_client):
        """Unauthenticated request to upsert story returns 401"""
        resp = unauth_client.put(
            f"/owner/{SHOP_ID}/story",
            json={"body": "從大稻埕起步的故事。", "is_published": True},
        )
        assert resp.status_code == 401


class TestTagsEndpoints:
    def test_get_tags_returns_current_tags(self, auth_client):
        """Owner retrieves the current owner-managed tags for their shop"""
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.get_owner_tags.return_value = ["安靜", "有插座", "寵物友善"]
            resp = auth_client.get(f"/owner/{SHOP_ID}/tags")

        assert resp.status_code == 200
        assert resp.json()["tags"] == ["安靜", "有插座", "寵物友善"]

    def test_put_tags_updates_and_returns_new_tags(self, auth_client):
        """Owner updates tags; endpoint returns updated list"""
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.update_owner_tags.return_value = ["安靜", "有窗座位"]
            resp = auth_client.put(
                f"/owner/{SHOP_ID}/tags",
                json={"tags": ["安靜", "有窗座位"]},
            )

        assert resp.status_code == 200
        assert resp.json()["tags"] == ["安靜", "有窗座位"]


class TestReviewsEndpoints:
    def test_get_reviews_returns_paginated_checkins(self, auth_client):
        """Owner can see all check-in reviews for their shop"""
        mock_review = {
            "id": "checkin-uuid",
            "user_id": "user-uuid",
            "note": "很棒的工作空間",
            "created_at": "2026-03-25T10:00:00Z",
        }
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.get_reviews.return_value = [mock_review]
            resp = auth_client.get(f"/owner/{SHOP_ID}/reviews")

        assert resp.status_code == 200
        assert len(resp.json()["reviews"]) == 1

    def test_get_reviews_accepts_page_param(self, auth_client):
        """Owner can paginate through check-in reviews"""
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.get_reviews.return_value = []
            resp = auth_client.get(f"/owner/{SHOP_ID}/reviews?page=2")

        assert resp.status_code == 200
        MockSvc.return_value.get_reviews.assert_called_once_with(SHOP_ID, page=2)

    def test_post_review_response_saves_owner_reply(self, auth_client):
        """Owner posts a reply to a check-in review; response is persisted"""
        checkin_id = "checkin-uuid-001"
        mock_response = MagicMock()
        mock_response.model_dump.return_value = {
            "id": "response-uuid",
            "checkin_id": checkin_id,
            "body": "謝謝您的光臨，期待再次見到您！",
            "created_at": "2026-03-27T00:00:00Z",
        }
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.upsert_review_response.return_value = mock_response
            resp = auth_client.post(
                f"/owner/{SHOP_ID}/reviews/{checkin_id}/response",
                json={"body": "謝謝您的光臨，期待再次見到您！"},
            )

        assert resp.status_code == 200
        assert resp.json()["checkin_id"] == checkin_id


class TestShopInfoEndpoints:
    def test_patch_info_updates_shop_details(self, auth_client):
        """Owner updates their shop information; endpoint returns updated data"""
        updated_info = {
            "description": "台北市大安區的精品咖啡廳，專注於單品咖啡。",
            "phone": "02-2345-6789",
            "website": "https://example-cafe.tw",
            "opening_hours": {"mon": "09:00-18:00"},
        }
        with patch("api.owner.OwnerService") as MockSvc:
            MockSvc.return_value.update_shop_info.return_value = updated_info
            resp = auth_client.patch(
                f"/owner/{SHOP_ID}/info",
                json={"description": "台北市大安區的精品咖啡廳，專注於單品咖啡。"},
            )

        assert resp.status_code == 200
