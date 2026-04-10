# backend/tests/test_profile_preferences.py
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from models.types import PreferenceOnboardingRequest
from services.profile_service import ProfileService


def _make_profiles_row(**overrides):
    base = {
        "preferred_modes": None,
        "preferred_vibes": None,
        "onboarding_note": None,
        "preferences_completed_at": None,
        "preferences_prompted_at": None,
    }
    base.update(overrides)
    return base


def _make_db(profiles_row=None, vibe_slugs=None):
    """Return a MagicMock supabase client with minimal table dispatch."""
    db = MagicMock()
    profiles_table = MagicMock()
    vibes_table = MagicMock()

    profiles_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = (
        profiles_row or _make_profiles_row()
    )
    profiles_table.update.return_value.eq.return_value.execute.return_value.data = [{}]

    vibes_table.select.return_value.in_.return_value.execute.return_value.data = [
        {"slug": s} for s in (vibe_slugs or [])
    ]

    db.table.side_effect = lambda name: {
        "profiles": profiles_table,
        "vibe_collections": vibes_table,
    }[name]
    return db, profiles_table, vibes_table


class TestGetPreferenceStatus:
    @pytest.mark.asyncio
    async def test_new_user_should_prompt(self):
        db, _, _ = _make_db()
        svc = ProfileService(db)
        status = await svc.get_preference_status("user-1")
        assert status.should_prompt is True

    @pytest.mark.asyncio
    async def test_completed_user_should_not_prompt(self):
        db, _, _ = _make_db(
            _make_profiles_row(
                preferences_completed_at="2026-04-10T00:00:00Z",
                preferred_modes=["work"],
            )
        )
        svc = ProfileService(db)
        status = await svc.get_preference_status("user-1")
        assert status.should_prompt is False
        assert status.preferred_modes == ["work"]

    @pytest.mark.asyncio
    async def test_dismissed_user_should_not_prompt(self):
        db, _, _ = _make_db(
            _make_profiles_row(
                preferences_prompted_at="2026-04-10T00:00:00Z",
            )
        )
        svc = ProfileService(db)
        status = await svc.get_preference_status("user-1")
        assert status.should_prompt is False


class TestSavePreferences:
    @pytest.mark.asyncio
    async def test_writes_all_fields_and_sets_completed_at(self):
        db, profiles_table, _ = _make_db(vibe_slugs=["study-cave"])
        svc = ProfileService(db)
        req = PreferenceOnboardingRequest(
            preferred_modes=["work", "rest"],
            preferred_vibes=["study-cave"],
            onboarding_note="quiet corners",
        )
        await svc.save_preferences("user-1", req)

        update_call = profiles_table.update.call_args[0][0]
        assert update_call["preferred_modes"] == ["work", "rest"]
        assert update_call["preferred_vibes"] == ["study-cave"]
        assert update_call["onboarding_note"] == "quiet corners"
        assert "preferences_completed_at" in update_call

    @pytest.mark.asyncio
    async def test_partial_update_only_writes_sent_fields(self):
        db, profiles_table, _ = _make_db()
        svc = ProfileService(db)
        req = PreferenceOnboardingRequest(preferred_modes=["rest"])
        await svc.save_preferences("user-1", req)

        update_call = profiles_table.update.call_args[0][0]
        assert update_call["preferred_modes"] == ["rest"]
        assert "preferred_vibes" not in update_call
        assert "onboarding_note" not in update_call
        assert "preferences_completed_at" in update_call  # always set

    @pytest.mark.asyncio
    async def test_unknown_vibe_slug_raises_422(self):
        db, _, _ = _make_db(vibe_slugs=[])  # no vibes exist in db
        svc = ProfileService(db)
        req = PreferenceOnboardingRequest(preferred_vibes=["ghost-slug"])
        with pytest.raises(HTTPException) as exc:
            await svc.save_preferences("user-1", req)
        assert exc.value.status_code == 422


class TestDismissPreferences:
    @pytest.mark.asyncio
    async def test_writes_prompted_at_only(self):
        db, profiles_table, _ = _make_db()
        svc = ProfileService(db)
        await svc.dismiss_preferences("user-1")

        update_call = profiles_table.update.call_args[0][0]
        assert "preferences_prompted_at" in update_call
        assert "preferences_completed_at" not in update_call


class TestGetPreferredModes:
    @pytest.mark.asyncio
    async def test_returns_none_when_not_set(self):
        db, _, _ = _make_db()
        svc = ProfileService(db)
        assert await svc.get_preferred_modes("user-1") is None

    @pytest.mark.asyncio
    async def test_returns_list_when_set(self):
        db, _, _ = _make_db(_make_profiles_row(preferred_modes=["work"]))
        svc = ProfileService(db)
        assert await svc.get_preferred_modes("user-1") == ["work"]
