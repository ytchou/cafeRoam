# backend/tests/test_profile_service.py
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from models.types import PreferenceOnboardingRequest, PreferenceOnboardingStatus, ProfileResponse
from services.profile_service import ProfileService


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


def _make_table_map(profile_data: list, stamp_count: int = 0, checkin_count: int = 0):
    """Build per-table mocks for asyncio.gather dispatch-by-name pattern."""
    profile_table = MagicMock()
    stamp_table = MagicMock()
    checkin_table = MagicMock()

    profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = (
        profile_data[0] if profile_data else None
    )
    stamp_table.select.return_value.eq.return_value.execute.return_value.count = stamp_count
    checkin_table.select.return_value.eq.return_value.execute.return_value.count = checkin_count

    return {"profiles": profile_table, "stamps": stamp_table, "check_ins": checkin_table}


class TestGetProfile:
    @pytest.mark.asyncio
    async def test_profile_page_shows_stamps_and_checkin_counts(self, mock_db: MagicMock):
        table_map = _make_table_map(
            profile_data=[
                {"display_name": "Mei-Ling", "avatar_url": "https://example.com/avatar.jpg"}
            ],
            stamp_count=12,
            checkin_count=8,
        )
        mock_db.table.side_effect = lambda name: table_map[name]

        service = ProfileService(db=mock_db)
        result = await service.get_profile("user-123")

        assert isinstance(result, ProfileResponse)
        assert result.display_name == "Mei-Ling"
        assert result.stamp_count == 12
        assert result.checkin_count == 8

    @pytest.mark.asyncio
    async def test_new_user_sees_zero_counts_before_first_checkin(self, mock_db: MagicMock):
        table_map = _make_table_map(
            profile_data=[{"display_name": None, "avatar_url": None}],
            stamp_count=0,
            checkin_count=0,
        )
        mock_db.table.side_effect = lambda name: table_map[name]

        service = ProfileService(db=mock_db)
        result = await service.get_profile("user-new")

        assert result.display_name is None
        assert result.stamp_count == 0
        assert result.checkin_count == 0


class TestUpdateProfile:
    @pytest.mark.asyncio
    async def test_user_can_update_their_display_name(self, mock_db: MagicMock):
        service = ProfileService(db=mock_db)
        await service.update_profile("user-123", fields={"display_name"}, display_name="New Name")

        mock_db.table.return_value.update.assert_called_once_with({"display_name": "New Name"})

    @pytest.mark.asyncio
    async def test_patch_with_no_fields_is_a_no_op(self, mock_db: MagicMock):
        service = ProfileService(db=mock_db)
        await service.update_profile("user-123", fields=set())

        mock_db.table.return_value.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_owner_can_turn_off_analytics_tracking_from_profile_settings(
        self, mock_db: MagicMock
    ):
        service = ProfileService(db=mock_db)

        await service.update_profile(
            "owner-456",
            fields={"analytics_opt_out"},
            analytics_opt_out=True,
        )

        mock_db.table.return_value.update.assert_called_once_with({"analytics_opt_out": True})

    @pytest.mark.asyncio
    async def test_profile_edit_saves_display_name_and_analytics_choice_together(
        self, mock_db: MagicMock
    ):
        service = ProfileService(db=mock_db)

        await service.update_profile(
            "owner-789",
            fields={"display_name", "analytics_opt_out"},
            display_name="Avery Chen",
            analytics_opt_out=True,
        )

        mock_db.table.return_value.update.assert_called_once_with(
            {"display_name": "Avery Chen", "analytics_opt_out": True}
        )


class TestSessionHeartbeat:
    @pytest.mark.asyncio
    async def test_first_session_returns_zero_counters(self, mock_db: MagicMock):
        """First-time user gets days=0 and previous_sessions=0."""
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "session_count": 0,
            "first_session_at": None,
            "last_session_at": None,
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.session_heartbeat("user-new")

        assert result["days_since_first_session"] == 0
        assert result["previous_sessions"] == 0  # 0 sessions before this one

    @pytest.mark.asyncio
    async def test_returning_user_gets_correct_session_count(self, mock_db: MagicMock):
        """Returning user after >30 min gets incremented count."""
        from datetime import UTC, datetime

        first = datetime(2026, 3, 1, tzinfo=UTC)
        last = datetime(2026, 3, 3, tzinfo=UTC)  # >30 min ago
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "session_count": 5,
            "first_session_at": first.isoformat(),
            "last_session_at": last.isoformat(),
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.session_heartbeat("user-returning")

        assert result["previous_sessions"] == 5  # 5 sessions before this one
        assert result["days_since_first_session"] >= 0

    @pytest.mark.asyncio
    async def test_heartbeat_within_30min_does_not_increment(self, mock_db: MagicMock):
        """Heartbeat within 30 min of last session does not increment counter."""
        from datetime import UTC, datetime, timedelta

        now = datetime.now(UTC)
        recent = now - timedelta(minutes=10)
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "session_count": 3,
            "first_session_at": (now - timedelta(days=5)).isoformat(),
            "last_session_at": recent.isoformat(),
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.session_heartbeat("user-active")

        # Counter NOT incremented (dedup within 30 min)
        assert result["previous_sessions"] == 3
        # Should NOT have called update
        profile_table.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_returning_after_days_shows_positive_days_since_first_session(
        self, mock_db: MagicMock
    ):
        from datetime import UTC, datetime, timedelta

        now = datetime.now(UTC)
        first = now - timedelta(days=7, hours=3)
        last = now - timedelta(hours=2)
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "session_count": 9,
            "first_session_at": first.isoformat(),
            "last_session_at": last.isoformat(),
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.session_heartbeat("user-loyal")

        assert isinstance(result["days_since_first_session"], int)
        assert result["days_since_first_session"] >= 1


class TestDeleteOwnerData:
    @pytest.mark.asyncio
    async def test_account_deletion_cleans_up_all_owner_managed_content(self, mock_db: MagicMock):
        service = ProfileService(db=mock_db)

        await service.delete_owner_data("owner-123")

        deleted_tables = [call.args[0] for call in mock_db.table.call_args_list]
        assert "shop_content" in deleted_tables
        assert "shop_owner_tags" in deleted_tables
        assert "review_responses" in deleted_tables
        assert "shop_claims" in deleted_tables
        assert mock_db.table.return_value.delete.call_count == 4


class TestGetPreferenceStatus:
    @pytest.mark.asyncio
    async def test_new_member_gets_prompted_when_no_preference_state_exists(
        self, mock_db: MagicMock
    ):
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": ["work"],
            "preferred_vibes": ["specialty-coffee"],
            "onboarding_note": "Quiet corners and pourover please.",
            "preferences_completed_at": None,
            "preferences_prompted_at": None,
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.get_preference_status("user-101")

        assert isinstance(result, PreferenceOnboardingStatus)
        assert result.should_prompt is True
        assert result.preferred_modes == ["work"]
        assert result.preferred_vibes == ["specialty-coffee"]

    @pytest.mark.asyncio
    async def test_completed_preferences_stop_the_prompt_from_showing_again(
        self, mock_db: MagicMock
    ):
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": ["social"],
            "preferred_vibes": None,
            "onboarding_note": None,
            "preferences_completed_at": "2026-04-01T10:00:00+00:00",
            "preferences_prompted_at": None,
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.get_preference_status("user-202")

        assert result.should_prompt is False
        assert result.preferred_modes == ["social"]
        assert result.preferred_vibes is None

    @pytest.mark.asyncio
    async def test_dismissed_prompt_stays_hidden_until_future_trigger(self, mock_db: MagicMock):
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": None,
            "preferred_vibes": ["late-night-study"],
            "onboarding_note": None,
            "preferences_completed_at": None,
            "preferences_prompted_at": "2026-04-02T11:30:00+00:00",
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.get_preference_status("user-303")

        assert result.should_prompt is False
        assert result.preferred_vibes == ["late-night-study"]


class TestSavePreferences:
    @pytest.mark.asyncio
    async def test_member_can_save_a_work_mode_and_complete_onboarding(self, mock_db: MagicMock):
        profile_table = MagicMock()
        profile_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": ["work"],
            "preferred_vibes": None,
            "onboarding_note": None,
            "preferences_completed_at": None,
            "preferences_prompted_at": None,
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.save_preferences(
            "user-404",
            PreferenceOnboardingRequest(preferred_modes=["work"]),
        )

        update_payload = profile_table.update.call_args.args[0]
        assert update_payload["preferred_modes"] == ["work"]
        assert update_payload["preferences_completed_at"]
        assert result.preferred_modes == ["work"]

    @pytest.mark.asyncio
    async def test_member_can_save_a_known_vibe_slug_successfully(self, mock_db: MagicMock):
        profile_table = MagicMock()
        profile_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": None,
            "preferred_vibes": ["specialty-coffee"],
            "onboarding_note": None,
            "preferences_completed_at": None,
            "preferences_prompted_at": None,
        }
        vibe_table = MagicMock()
        vibe_table.select.return_value.in_.return_value.execute.return_value.data = [
            {"slug": "specialty-coffee"}
        ]
        mock_db.table.side_effect = (
            lambda name: vibe_table if name == "vibe_collections" else profile_table
        )

        service = ProfileService(db=mock_db)
        result = await service.save_preferences(
            "user-505",
            PreferenceOnboardingRequest(preferred_vibes=["specialty-coffee"]),
        )

        update_payload = profile_table.update.call_args.args[0]
        assert update_payload["preferred_vibes"] == ["specialty-coffee"]
        assert result.preferred_vibes == ["specialty-coffee"]

    @pytest.mark.asyncio
    async def test_member_gets_validation_error_for_unknown_vibe_slug(self, mock_db: MagicMock):
        profile_table = MagicMock()
        vibe_table = MagicMock()
        vibe_table.select.return_value.in_.return_value.execute.return_value.data = []
        mock_db.table.side_effect = (
            lambda name: vibe_table if name == "vibe_collections" else profile_table
        )

        service = ProfileService(db=mock_db)

        with pytest.raises(HTTPException) as exc_info:
            await service.save_preferences(
                "user-606",
                PreferenceOnboardingRequest(preferred_vibes=["mystery-vibes"]),
            )

        assert exc_info.value.status_code == 422
        assert "mystery-vibes" in str(exc_info.value.detail)


class TestDismissPreferences:
    @pytest.mark.asyncio
    async def test_member_can_dismiss_onboarding_and_not_be_prompted_again(
        self, mock_db: MagicMock
    ):
        profile_table = MagicMock()
        profile_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": ["rest"],
            "preferred_vibes": None,
            "onboarding_note": None,
            "preferences_completed_at": None,
            "preferences_prompted_at": "2026-04-03T09:00:00+00:00",
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.dismiss_preferences("user-707")

        update_payload = profile_table.update.call_args.args[0]
        assert update_payload["preferences_prompted_at"]
        assert result.should_prompt is False


class TestGetPreferredModes:
    @pytest.mark.asyncio
    async def test_profile_returns_saved_modes_for_recommendation_filters(self, mock_db: MagicMock):
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": ["rest", "social"]
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.get_preferred_modes("user-808")

        assert result == ["rest", "social"]

    @pytest.mark.asyncio
    async def test_profile_returns_none_when_member_has_no_saved_modes(self, mock_db: MagicMock):
        profile_table = MagicMock()
        profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "preferred_modes": None
        }
        mock_db.table.return_value = profile_table

        service = ProfileService(db=mock_db)
        result = await service.get_preferred_modes("user-909")

        assert result is None


class TestValidateVibeSlugs:
    @pytest.mark.asyncio
    async def test_known_vibe_slugs_pass_validation_for_onboarding_choices(
        self, mock_db: MagicMock
    ):
        vibe_table = MagicMock()
        vibe_table.select.return_value.in_.return_value.execute.return_value.data = [
            {"slug": "specialty-coffee"},
            {"slug": "late-night-study"},
        ]
        mock_db.table.return_value = vibe_table

        service = ProfileService(db=mock_db)

        await service._validate_vibe_slugs(["specialty-coffee", "late-night-study"])

    @pytest.mark.asyncio
    async def test_unknown_vibe_slug_is_reported_back_to_the_member(self, mock_db: MagicMock):
        vibe_table = MagicMock()
        vibe_table.select.return_value.in_.return_value.execute.return_value.data = [
            {"slug": "specialty-coffee"}
        ]
        mock_db.table.return_value = vibe_table

        service = ProfileService(db=mock_db)

        with pytest.raises(HTTPException) as exc_info:
            await service._validate_vibe_slugs(["specialty-coffee", "vinyl-listening"])

        assert exc_info.value.status_code == 422
        assert "vinyl-listening" in str(exc_info.value.detail)
