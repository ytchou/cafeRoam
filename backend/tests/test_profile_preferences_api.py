# backend/tests/test_profile_preferences_api.py
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app
from models.types import PreferenceOnboardingStatus


@pytest.fixture
def client():
    return TestClient(app)


FAKE_USER = {"id": "user-1", "app_metadata": {"pdpa_consented": True}}


def _status(should_prompt=True, modes=None, vibes=None, note=None):
    return PreferenceOnboardingStatus(
        should_prompt=should_prompt,
        preferred_modes=modes,
        preferred_vibes=vibes,
        onboarding_note=note,
    )


class TestGetPreferencesStatus:
    def test_returns_should_prompt_for_new_user(self, client):
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[get_user_db] = lambda: MagicMock()
        try:
            with patch("api.profile.ProfileService") as svc_cls:
                svc_cls.return_value.get_preference_status = AsyncMock(return_value=_status(True))
                res = client.get("/profile/preferences/status")
            assert res.status_code == 200
            assert res.json()["shouldPrompt"] is True
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_user_db, None)


class TestPostPreferences:
    def test_saves_and_returns_updated_status(self, client):
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[get_user_db] = lambda: MagicMock()
        try:
            with patch("api.profile.ProfileService") as svc_cls:
                svc_cls.return_value.save_preferences = AsyncMock(
                    return_value=_status(False, modes=["work"]),
                )
                res = client.post(
                    "/profile/preferences",
                    json={"preferredModes": ["work"]},
                )
            assert res.status_code == 200
            assert res.json()["shouldPrompt"] is False
            assert res.json()["preferredModes"] == ["work"]
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_user_db, None)

    def test_rejects_bad_mode_literal(self, client):
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[get_user_db] = lambda: MagicMock()
        try:
            res = client.post(
                "/profile/preferences",
                json={"preferredModes": ["sleep"]},
            )
            assert res.status_code == 422
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_user_db, None)


class TestDismissPreferences:
    def test_writes_prompted_at(self, client):
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[get_user_db] = lambda: MagicMock()
        try:
            with patch("api.profile.ProfileService") as svc_cls:
                svc_cls.return_value.dismiss_preferences = AsyncMock(
                    return_value=_status(False),
                )
                res = client.post("/profile/preferences/dismiss")
            assert res.status_code == 200
            assert res.json()["shouldPrompt"] is False
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_user_db, None)
