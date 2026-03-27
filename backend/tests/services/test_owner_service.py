from unittest.mock import MagicMock

import pytest

from services.owner_service import OwnerService

SHOP_ID = "550e8400-e29b-41d4-a716-446655440000"


class TestGetDashboardStats:
    @pytest.fixture
    def mock_db(self):
        return MagicMock()

    def test_returns_aggregate_counts(self, mock_db):
        """Given an active shop, dashboard stats aggregate from Supabase tables"""
        # Mock check-in count
        mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value.count = 42
        mock_analytics = MagicMock()
        mock_analytics.query_hogql.return_value = [{"views": 150}]
        svc = OwnerService(db=mock_db, analytics=mock_analytics)
        stats = svc.get_dashboard_stats(SHOP_ID)

        assert stats.checkin_count_30d == 42
        assert stats.page_views_30d == 150

    def test_page_views_defaults_to_zero_when_no_analytics(self, mock_db):
        """Given no analytics provider, page views returns 0"""
        svc = OwnerService(db=mock_db)
        stats = svc.get_dashboard_stats(SHOP_ID)

        assert stats.page_views_30d == 0


class TestGetSearchInsights:
    def test_returns_top_queries(self):
        """Owner sees which search terms surfaced their shop in last 30 days"""
        mock_db = MagicMock()
        mock_analytics = MagicMock()
        mock_analytics.query_hogql.return_value = [
            {"query": "安靜工作空間", "impressions": 28},
            {"query": "寵物友善咖啡", "impressions": 15},
        ]
        svc = OwnerService(db=mock_db, analytics=mock_analytics)
        result = svc.get_search_insights(SHOP_ID)

        assert len(result) == 2
        assert result[0].query == "安靜工作空間"
        assert result[0].impressions == 28

    def test_returns_empty_list_when_no_data(self):
        """If no search impressions yet, returns empty list (not error)"""
        mock_db = MagicMock()
        mock_analytics = MagicMock()
        mock_analytics.query_hogql.return_value = []
        svc = OwnerService(db=mock_db, analytics=mock_analytics)
        result = svc.get_search_insights(SHOP_ID)

        assert result == []

    def test_returns_empty_list_when_no_analytics_provider(self):
        """If analytics provider is not configured, returns empty list"""
        mock_db = MagicMock()
        svc = OwnerService(db=mock_db)
        result = svc.get_search_insights(SHOP_ID)

        assert result == []


class TestGetCommunityPulse:
    def test_returns_anonymized_tag_counts(self):
        """Community pulse shows tag frequencies — no user attribution"""
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value.data = [
            {"tags": ["安靜", "插座充足"]},
            {"tags": ["安靜", "寵物友善"]},
        ]
        svc = OwnerService(db=mock_db)
        result = svc.get_community_pulse(SHOP_ID)

        tag_map = {r.tag: r.count for r in result}
        assert tag_map["安靜"] == 2
        assert tag_map["插座充足"] == 1
        # No user IDs or names in result
        for item in result:
            assert not hasattr(item, "user_id")


class TestShopStory:
    def test_upsert_creates_new_story(self):
        """Owner publishes a shop story for the first time"""
        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value.data = [{
            "id": "content-uuid",
            "shop_id": SHOP_ID,
            "owner_id": "owner-uuid",
            "content_type": "story",
            "title": "Our Story",
            "body": "我們的咖啡館誕生於2019年的大稻埕老街。",
            "photo_url": None,
            "is_published": True,
            "created_at": "2026-03-27T00:00:00Z",
            "updated_at": "2026-03-27T00:00:00Z",
        }]
        from models.owner import OwnerStoryIn
        svc = OwnerService(db=mock_db)
        story_in = OwnerStoryIn(
            title="Our Story",
            body="我們的咖啡館誕生於2019年的大稻埕老街。",
            is_published=True,
        )
        result = svc.upsert_shop_story(SHOP_ID, "owner-uuid", story_in)

        assert result.is_published is True
        assert result.body == "我們的咖啡館誕生於2019年的大稻埕老街。"

    def test_get_story_returns_none_when_not_found(self):
        """get_shop_story returns None if no story exists"""
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        svc = OwnerService(db=mock_db)

        result = svc.get_shop_story(SHOP_ID)
        assert result is None


class TestOwnerTags:
    def test_update_tags_replaces_entire_set(self):
        """Updating owner tags replaces the full set — no partial updates"""
        mock_db = MagicMock()
        mock_db.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "t1", "shop_id": SHOP_ID, "owner_id": "owner-uuid", "tag": "安靜工作空間", "created_at": "2026-03-27T00:00:00Z"},
        ]
        svc = OwnerService(db=mock_db)
        result = svc.update_owner_tags(SHOP_ID, "owner-uuid", ["安靜工作空間"])

        assert len(result) == 1
        assert result[0] == "安靜工作空間"

    def test_update_tags_enforces_max_10(self):
        """Attempting to set more than 10 tags raises ValueError"""
        mock_db = MagicMock()
        svc = OwnerService(db=mock_db)
        tags = [f"tag{i}" for i in range(11)]

        with pytest.raises(ValueError, match="maximum 10 tags"):
            svc.update_owner_tags(SHOP_ID, "owner-uuid", tags)


class TestReviews:
    def test_get_reviews_returns_checkins_with_notes(self):
        """Owner sees all check-in reviews for their shop, paginated"""
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.order.return_value.range.return_value.execute.return_value.data = [
            {"id": "ci-1", "note": "超棒的咖啡！", "created_at": "2026-03-27T10:00:00Z",
             "review_responses": []},
        ]
        svc = OwnerService(db=mock_db)
        result = svc.get_reviews(SHOP_ID, page=1)

        assert len(result) == 1
        assert result[0]["id"] == "ci-1"

    def test_upsert_review_response_prevents_duplicate(self):
        """One response per review — upsert replaces rather than duplicates"""
        mock_db = MagicMock()
        # Mock checkin ownership verification
        mock_db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "shop_id": SHOP_ID
        }
        mock_db.table.return_value.upsert.return_value.execute.return_value.data = [{
            "id": "rr-1",
            "checkin_id": "ci-1",
            "body": "感謝您的到來！",
            "created_at": "2026-03-27T11:00:00Z",
        }]
        svc = OwnerService(db=mock_db)
        result = svc.upsert_review_response(
            checkin_id="ci-1",
            shop_id=SHOP_ID,
            owner_id="owner-uuid",
            body="感謝您的到來！",
        )
        assert result.body == "感謝您的到來！"

        # Verify upsert (not insert) was used — UNIQUE(checkin_id) enforces one per review
        mock_db.table.return_value.upsert.assert_called_once()
