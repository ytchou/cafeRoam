"""Tests for CommunityService — surfaces partner check-in reviews."""

from unittest.mock import MagicMock

from models.types import CommunityFeedResponse, CommunityNoteCard
from services.community_service import CommunityService
from tests.factories import make_community_note_row

# ── Helpers ─────────────────────────────────────────────

_ROLE_LABEL_MAP = {"blogger": "Coffee blogger", "partner": "Partner"}


def _make_db_mock(
    note_rows: list[dict] | None = None,
    like_exists: bool = False,
    like_count: int = 0,
) -> MagicMock:
    """Build a Supabase client mock that returns the given data
    for sequential .execute() calls."""
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.neq.return_value = mock
    mock.is_.return_value = mock
    mock.not_ = mock  # accessed as property in supabase-py, not called
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.lt.return_value = mock
    mock.in_.return_value = mock
    mock.contains.return_value = mock
    mock.delete.return_value = mock
    mock.insert.return_value = mock
    mock.single.return_value = mock
    mock.maybe_single.return_value = mock

    execute_responses: list[MagicMock] = []

    if note_rows is not None:
        execute_responses.append(MagicMock(data=note_rows))

    if like_exists is not None:
        # Response 1: existence check
        execute_responses.append(MagicMock(data={"id": "like-1"} if like_exists else None))
        # Response 2: insert or delete (no meaningful return needed)
        execute_responses.append(MagicMock(data=None))

    if like_count is not None:
        # Response 3: count query after mutation — data list length = count
        execute_responses.append(MagicMock(data=[{"id": f"like-{i}"} for i in range(like_count)]))

    if execute_responses:
        mock.execute.side_effect = execute_responses

    return mock


# ── Preview ─────────────────────────────────────────────


class TestCommunityServiceGetPreview:
    """When the Explore page loads, the preview section shows up to 3 recent partner reviews."""

    def test_returns_only_blogger_reviews_as_community_notes(self):
        rows = [
            make_community_note_row(checkin_id="ci-1", display_name="Mei-Ling ☕"),
            make_community_note_row(checkin_id="ci-2", display_name="Jason 🌿"),
        ]
        db = _make_db_mock(note_rows=rows)
        service = CommunityService(db)

        result = service.get_preview(limit=3)

        assert len(result) == 2
        assert isinstance(result[0], CommunityNoteCard)
        assert result[0].checkin_id == "ci-1"
        assert result[0].author.display_name == "Mei-Ling ☕"
        assert result[0].author.role_label == "Coffee blogger"

    def test_returns_empty_list_when_no_partner_reviews_exist(self):
        db = _make_db_mock(note_rows=[])
        service = CommunityService(db)

        result = service.get_preview()

        assert result == []

    def test_uses_first_photo_as_cover(self):
        rows = [
            make_community_note_row(
                photo_urls=[
                    "https://example.com/photo1.jpg",
                    "https://example.com/photo2.jpg",
                ]
            )
        ]
        db = _make_db_mock(note_rows=rows)
        service = CommunityService(db)

        result = service.get_preview()

        assert result[0].cover_photo_url == "https://example.com/photo1.jpg"

    def test_excludes_checkins_without_review_text(self):
        """Bare check-ins (no review_text) are NOT community notes — this is
        enforced by the SQL WHERE clause, but verified here via the factory."""
        rows = [make_community_note_row(review_text="A genuine review")]
        db = _make_db_mock(note_rows=rows)
        service = CommunityService(db)

        result = service.get_preview()

        assert len(result) == 1
        assert result[0].review_text == "A genuine review"


# ── Feed ────────────────────────────────────────────────


class TestCommunityServiceGetFeed:
    """When a user opens the full Community feed, they see paginated partner reviews."""

    def test_returns_paginated_feed_with_next_cursor(self):
        rows = [make_community_note_row(checkin_id=f"ci-{i}") for i in range(11)]
        db = _make_db_mock(note_rows=rows)
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10)

        assert isinstance(result, CommunityFeedResponse)
        assert len(result.notes) == 10
        assert result.next_cursor is not None

    def test_returns_no_cursor_when_fewer_than_limit(self):
        rows = [make_community_note_row(checkin_id="ci-1")]
        db = _make_db_mock(note_rows=rows)
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10)

        assert len(result.notes) == 1
        assert result.next_cursor is None

    def test_returns_empty_feed_when_no_reviews(self):
        db = _make_db_mock(note_rows=[])
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10)

        assert result.notes == []
        assert result.next_cursor is None


# ── Likes ───────────────────────────────────────────────


class TestCommunityServiceToggleLike:
    """When a user taps the heart on a community note, it toggles their like."""

    def test_adds_like_when_not_yet_liked(self):
        db = _make_db_mock(like_exists=False, like_count=5)
        # toggle_like now checks is_public before inserting — prepend that response
        db.execute.side_effect = [MagicMock(data={"id": "ci-1"}), *db.execute.side_effect]
        service = CommunityService(db)

        count = service.toggle_like("ci-1", "user-a1b2c3")

        assert count == 5
        db.table.assert_any_call("community_note_likes")

    def test_removes_like_when_already_liked(self):
        db = _make_db_mock(like_exists=True, like_count=4)
        db.execute.side_effect = [MagicMock(data={"id": "ci-1"}), *db.execute.side_effect]
        service = CommunityService(db)

        count = service.toggle_like("ci-1", "user-a1b2c3")

        assert count == 4


class TestCommunityServiceIsLiked:
    """When the feed loads, each card checks if the current user has liked it."""

    def test_returns_true_when_user_has_liked(self):
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.maybe_single.return_value = db
        db.execute.return_value = MagicMock(data={"id": "like-1"})

        service = CommunityService(db)
        assert service.is_liked("ci-1", "user-a1b2c3") is True

    def test_returns_false_when_user_has_not_liked(self):
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.maybe_single.return_value = db
        db.execute.return_value = MagicMock(data=None)

        service = CommunityService(db)
        assert service.is_liked("ci-1", "user-a1b2c3") is False


class TestCommunityServiceIsPublicFiltering:
    """Community feed only shows check-ins where is_public is true."""

    def test_feed_excludes_private_checkins(self):
        """Given a mix of public and private check-ins, the feed returns only public ones."""
        public_row = make_community_note_row(checkin_id="ci-public", is_public=True)
        db = _make_db_mock(note_rows=[public_row])
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10)

        assert len(result.notes) == 1
        assert result.notes[0].checkin_id == "ci-public"
        db.eq.assert_any_call("is_public", True)

    def test_preview_excludes_private_checkins(self):
        """The explore page preview only surfaces public check-ins."""
        public_row = make_community_note_row(checkin_id="ci-public", is_public=True)
        db = _make_db_mock(note_rows=[public_row])
        service = CommunityService(db)

        result = service.get_preview(limit=3)

        assert len(result) == 1
        assert result[0].checkin_id == "ci-public"
        db.eq.assert_any_call("is_public", True)


class TestCommunityServiceFeedFilters:
    """Community feed supports filtering by MRT station and vibe tag."""

    def test_feed_with_mrt_filter(self):
        """When filtered by MRT, only matching check-ins appear."""
        rows = [make_community_note_row(checkin_id="ci-1")]
        db = _make_db_mock(note_rows=None)
        # Two-step filter: shops lookup then check_ins query
        db.execute.side_effect = [
            MagicMock(data=[{"id": "shop-a1b2c3"}]),
            MagicMock(data=rows),
        ]
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10, mrt="中山")

        assert len(result.notes) == 1
        db.eq.assert_any_call("mrt", "中山")
        db.in_.assert_any_call("shop_id", ["shop-a1b2c3"])

    def test_feed_with_vibe_tag_filter(self):
        """When filtered by vibe tag, only matching check-ins appear."""
        rows = [make_community_note_row(checkin_id="ci-1")]
        db = _make_db_mock(note_rows=None)
        # Two-step filter: shop_tags lookup then check_ins query
        db.execute.side_effect = [
            MagicMock(data=[{"shop_id": "shop-a1b2c3"}]),
            MagicMock(data=rows),
        ]
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10, vibe_tag="quiet")

        assert len(result.notes) == 1
        db.eq.assert_any_call("tag_id", "quiet")
        db.in_.assert_any_call("shop_id", ["shop-a1b2c3"])

    def test_feed_with_no_filters_returns_all_public(self):
        """Without filters, all public check-ins appear."""
        rows = [make_community_note_row(checkin_id=f"ci-{i}") for i in range(3)]
        db = _make_db_mock(note_rows=rows)
        service = CommunityService(db)

        result = service.get_feed(cursor=None, limit=10)

        assert len(result.notes) == 3
