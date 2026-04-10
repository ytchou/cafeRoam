# backend/tests/test_types_preferences.py
import pytest
from pydantic import ValidationError

from models.types import PreferenceOnboardingRequest, PreferenceOnboardingStatus


class TestPreferenceOnboardingRequest:
    def test_accepts_all_fields_empty(self):
        req = PreferenceOnboardingRequest()
        assert req.preferred_modes is None
        assert req.preferred_vibes is None
        assert req.onboarding_note is None

    def test_accepts_valid_modes(self):
        req = PreferenceOnboardingRequest(preferred_modes=["work", "rest"])
        assert req.preferred_modes == ["work", "rest"]

    def test_rejects_invalid_mode_literal(self):
        with pytest.raises(ValidationError):
            PreferenceOnboardingRequest(preferred_modes=["sleep"])

    def test_accepts_vibe_slugs_as_strings(self):
        req = PreferenceOnboardingRequest(preferred_vibes=["study-cave", "cat-cafe"])
        assert req.preferred_vibes == ["study-cave", "cat-cafe"]

    def test_rejects_note_over_280_chars(self):
        with pytest.raises(ValidationError):
            PreferenceOnboardingRequest(onboarding_note="x" * 281)

    def test_accepts_note_at_exactly_280(self):
        req = PreferenceOnboardingRequest(onboarding_note="x" * 280)
        assert req.onboarding_note == "x" * 280

    def test_camel_case_alias_roundtrip(self):
        req = PreferenceOnboardingRequest.model_validate(
            {
                "preferredModes": ["work"],
                "preferredVibes": ["deep-work"],
                "onboardingNote": "late nights only",
            }
        )
        assert req.preferred_modes == ["work"]
        assert req.preferred_vibes == ["deep-work"]
        assert req.onboarding_note == "late nights only"


class TestPreferenceOnboardingStatus:
    def test_serializes_to_camel_case(self):
        status = PreferenceOnboardingStatus(
            should_prompt=True,
            preferred_modes=None,
            preferred_vibes=None,
            onboarding_note=None,
        )
        payload = status.model_dump(by_alias=True)
        assert payload["shouldPrompt"] is True
        assert "preferredModes" in payload
