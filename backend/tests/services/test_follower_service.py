"""Tests for FollowerService — follow/unfollow shops and count queries."""

from unittest.mock import MagicMock

from postgrest.exceptions import APIError

from services.follower_service import FollowerService
from tests.factories import make_follow_row


class TestFollow:
    """When a user taps the heart icon on a shop page to follow it."""

    def test_creates_follow_relationship_and_returns_count(self):
        db = MagicMock()
        db.table.return_value = db
        db.insert.return_value = db
        db.select.return_value = db
        db.eq.return_value = db

        insert_resp = MagicMock(data=make_follow_row())
        count_resp = MagicMock(count=5, data=[])
        db.execute.side_effect = [insert_resp, count_resp]

        service = FollowerService(db=db)
        result = service.follow(user_id="user-a1b2c3", shop_id="shop-d4e5f6")

        assert result.following is True
        assert result.follower_count == 5

    def test_idempotent_when_already_following(self):
        db = MagicMock()
        db.table.return_value = db
        db.insert.return_value = db
        db.select.return_value = db
        db.eq.return_value = db

        db.execute.side_effect = [
            APIError({"message": "duplicate key", "code": "23505"}),
            MagicMock(count=10, data=[]),
        ]

        service = FollowerService(db=db)
        result = service.follow(user_id="user-a1b2c3", shop_id="shop-d4e5f6")

        assert result.following is True
        assert result.follower_count == 10

    def test_raises_value_error_for_nonexistent_shop(self):
        db = MagicMock()
        db.table.return_value = db
        db.insert.return_value = db
        db.eq.return_value = db

        db.execute.side_effect = APIError(
            {"message": "violates foreign key constraint", "code": "23503"}
        )

        service = FollowerService(db=db)
        try:
            service.follow(user_id="user-a1b2c3", shop_id="nonexistent")
            raise AssertionError("Should have raised ValueError")
        except ValueError as e:
            assert "not found" in str(e).lower()


class TestUnfollow:
    """When a user taps the filled heart to unfollow a shop."""

    def test_removes_follow_and_returns_count(self):
        db = MagicMock()
        db.table.return_value = db
        db.delete.return_value = db
        db.select.return_value = db
        db.eq.return_value = db

        delete_resp = MagicMock(data=[make_follow_row()])
        count_resp = MagicMock(count=4, data=[])
        db.execute.side_effect = [delete_resp, count_resp]

        service = FollowerService(db=db)
        result = service.unfollow(user_id="user-a1b2c3", shop_id="shop-d4e5f6")

        assert result.following is False
        assert result.follower_count == 4

    def test_idempotent_when_not_following(self):
        db = MagicMock()
        db.table.return_value = db
        db.delete.return_value = db
        db.select.return_value = db
        db.eq.return_value = db

        delete_resp = MagicMock(data=[])
        count_resp = MagicMock(count=0, data=[])
        db.execute.side_effect = [delete_resp, count_resp]

        service = FollowerService(db=db)
        result = service.unfollow(user_id="user-a1b2c3", shop_id="shop-d4e5f6")

        assert result.following is False
        assert result.follower_count == 0


class TestGetFollowerCount:
    """When a shop detail page loads and needs the follower count."""

    def test_returns_visible_true_when_above_threshold(self):
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.maybe_single.return_value = db

        count_resp = MagicMock(count=42, data=[])
        follow_resp = MagicMock(data=make_follow_row())
        db.execute.side_effect = [count_resp, follow_resp]

        service = FollowerService(db=db)
        result = service.get_follower_count(shop_id="shop-d4e5f6", user_id="user-a1b2c3")

        assert result.count == 42
        assert result.visible is True
        assert result.is_following is True

    def test_returns_visible_false_when_below_threshold(self):
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db

        count_resp = MagicMock(count=3, data=[])
        db.execute.side_effect = [count_resp]

        service = FollowerService(db=db)
        result = service.get_follower_count(shop_id="shop-d4e5f6", user_id=None)

        assert result.count == 3
        assert result.visible is False
        assert result.is_following is None

    def test_returns_is_following_false_when_user_not_following(self):
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.maybe_single.return_value = db

        count_resp = MagicMock(count=15, data=[])
        follow_resp = MagicMock(data=None)
        db.execute.side_effect = [count_resp, follow_resp]

        service = FollowerService(db=db)
        result = service.get_follower_count(shop_id="shop-d4e5f6", user_id="user-a1b2c3")

        assert result.count == 15
        assert result.visible is True
        assert result.is_following is False


class TestGetFollowing:
    """When a user views their profile's Following section."""

    def test_returns_paginated_followed_shops(self):
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.order.return_value = db
        db.range.return_value = db

        follow_rows = [
            {
                "created_at": "2026-03-20T10:00:00",
                "shops": {
                    "id": "shop-d4e5f6",
                    "name": "山小孩咖啡",
                    "address": "台北市大安區溫州街74巷5弄2號",
                    "slug": "mountain-kid-coffee",
                    "mrt": "台電大樓",
                    "primary_tag": "工作咖啡廳",
                },
            },
        ]

        db.execute.side_effect = [
            MagicMock(data=follow_rows, count=1),
        ]

        service = FollowerService(db=db)
        result = service.get_following(user_id="user-a1b2c3", page=1, limit=20)

        assert result.page == 1
        assert result.total == 1
        assert result.limit == 20
        assert result.has_more is False
        assert len(result.shops) == 1
        assert result.shops[0].name == "山小孩咖啡"
        assert result.shops[0].primary_tag == "工作咖啡廳"
        assert result.shops[0].followed_at == "2026-03-20T10:00:00"
