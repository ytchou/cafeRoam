from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app

client = TestClient(app)


class TestShopReviewsAPI:
    def test_unauthenticated_user_cannot_view_reviews(self):
        """When a visitor requests shop reviews without logging in, they get 401."""
        response = client.get("/shops/shop-abc123/reviews")
        assert response.status_code == 401

    def test_authenticated_user_sees_aggregated_review_data(self):
        """Logged-in user gets reviews list, total count, and average rating for a shop."""
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-chen-wei"}
        with patch("api.shops.get_admin_db") as mock_admin:
            mock_db = MagicMock()
            mock_admin.return_value = mock_db

            review_rows = [
                {
                    "id": "ci-review-1",
                    "user_id": "user-chen-wei",
                    "stars": 4,
                    "review_text": "Excellent pour-over, cozy atmosphere",
                    "confirmed_tags": ["has-wifi", "quiet"],
                    "reviewed_at": "2026-03-01T14:30:00Z",
                    "profiles": {"display_name": "Chen Wei"},
                },
                {
                    "id": "ci-review-2",
                    "user_id": "user-mei-lin",
                    "stars": 5,
                    "review_text": "Best single-origin in Taipei",
                    "confirmed_tags": ["specialty-coffee"],
                    "reviewed_at": "2026-03-02T09:15:00Z",
                    "profiles": {"display_name": "Mei Lin"},
                },
            ]

            # Mock the chained Supabase query:
            # table().select().eq().not_().order().limit().offset().execute()
            chain = mock_db.table.return_value
            chain = chain.select.return_value
            chain = chain.eq.return_value
            chain = chain.not_.return_value
            chain = chain.order.return_value
            chain = chain.limit.return_value
            chain = chain.offset.return_value
            chain.execute.return_value = MagicMock(data=review_rows, count=2)

            response = client.get("/shops/shop-abc123/reviews")

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert data["average_rating"] == 4.5
        assert len(data["reviews"]) == 2
        assert data["reviews"][0]["display_name"] == "Chen Wei"
        assert data["reviews"][0]["stars"] == 4
        assert data["reviews"][1]["display_name"] == "Mei Lin"

    def test_shop_with_no_reviews_returns_empty_and_zero_average(self):
        """When a shop has no reviews, the response has an empty list and 0.0 average."""
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-chen-wei"}
        with patch("api.shops.get_admin_db") as mock_admin:
            mock_db = MagicMock()
            mock_admin.return_value = mock_db

            chain = mock_db.table.return_value
            chain = chain.select.return_value
            chain = chain.eq.return_value
            chain = chain.not_.return_value
            chain = chain.order.return_value
            chain = chain.limit.return_value
            chain = chain.offset.return_value
            chain.execute.return_value = MagicMock(data=[], count=0)

            response = client.get("/shops/shop-empty/reviews")

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 0
        assert data["average_rating"] == 0.0
        assert data["reviews"] == []
