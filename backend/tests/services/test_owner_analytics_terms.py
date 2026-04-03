from unittest.mock import MagicMock

import pytest

from services.owner_service import OwnerService

SHOP_ID = "550e8400-e29b-41d4-a716-446655440001"
USER_ID = "550e8400-e29b-41d4-a716-446655440002"


@pytest.fixture
def db():
    client = MagicMock()
    client.table.return_value = client
    client.select.return_value = client
    client.update.return_value = client
    client.eq.return_value = client
    client.is_.return_value = client
    client.maybe_single.return_value = client
    client.execute.return_value = MagicMock(data=None)
    return client


@pytest.fixture
def svc(db) -> OwnerService:
    return OwnerService(db=db)


class TestGetAnalyticsTermsStatus:
    def test_returns_false_when_terms_not_yet_accepted(self, db, svc):
        db.execute.return_value = MagicMock(data={"analytics_terms_accepted_at": None})
        assert svc.get_analytics_terms_status(SHOP_ID, USER_ID) is False

    def test_returns_true_when_owner_has_accepted_terms(self, db, svc):
        db.execute.return_value = MagicMock(
            data={"analytics_terms_accepted_at": "2026-04-03T12:00:00+00:00"}
        )
        assert svc.get_analytics_terms_status(SHOP_ID, USER_ID) is True

    def test_returns_false_when_no_approved_claim_exists(self, db, svc):
        db.execute.return_value = MagicMock(data=None)
        assert svc.get_analytics_terms_status(SHOP_ID, USER_ID) is False

    def test_queries_correct_table_and_filters(self, db, svc):
        db.execute.return_value = MagicMock(data=None)
        svc.get_analytics_terms_status(SHOP_ID, USER_ID)

        db.table.assert_called_with("shop_claims")
        db.select.assert_called_with("analytics_terms_accepted_at")


class TestAcceptAnalyticsTerms:
    def test_sets_accepted_timestamp_on_approved_claim(self, db, svc):
        svc.accept_analytics_terms(SHOP_ID, USER_ID)

        db.table.assert_called_with("shop_claims")
        update_arg = db.update.call_args[0][0]
        assert "analytics_terms_accepted_at" in update_arg

    def test_acceptance_is_idempotent_via_null_guard(self, db, svc):
        svc.accept_analytics_terms(SHOP_ID, USER_ID)
        # The null guard (.is_("analytics_terms_accepted_at", "null")) ensures
        # the UPDATE only fires when not yet accepted — harmless no-op otherwise.
        db.is_.assert_called_with("analytics_terms_accepted_at", "null")


class TestSuppressDemographicSlice:
    def test_allows_slice_when_k_threshold_exactly_met(self):
        assert OwnerService.suppress_demographic_slice(10) is True

    def test_allows_slice_above_threshold(self):
        assert OwnerService.suppress_demographic_slice(25) is True

    def test_suppresses_slice_one_below_threshold(self):
        assert OwnerService.suppress_demographic_slice(9) is False

    def test_suppresses_empty_slice(self):
        assert OwnerService.suppress_demographic_slice(0) is False
