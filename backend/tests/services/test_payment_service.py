"""Tests for PaymentService — payment method queries and community confirmations."""

from unittest.mock import MagicMock

from services.payment_service import PaymentService


class TestGetPaymentMethods:
    """When a user views the payment methods section on a shop detail page."""

    def test_returns_methods_from_shop_jsonb(self):
        """Shop has payment_methods JSONB — returns known methods."""
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.single.return_value = db

        # Shop with {cash: true, card: false}
        shop_resp = MagicMock(data={"payment_methods": {"cash": True, "card": False}})
        # No confirmations
        confirmations_resp = MagicMock(data=[])
        db.execute.side_effect = [shop_resp, confirmations_resp]

        service = PaymentService(db=db)
        result = service.get_payment_methods(shop_id="shop-d4e5f6", user_id=None)

        methods_by_name = {m.method: m for m in result.methods}
        assert methods_by_name["cash"].accepted is True
        assert methods_by_name["card"].accepted is False
        assert "line_pay" not in methods_by_name  # null/missing → hidden

    def test_merges_confirmation_counts(self):
        """Community confirmations are merged into the response."""
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.single.return_value = db

        shop_resp = MagicMock(data={"payment_methods": {"cash": True, "line_pay": True}})
        confirmations_resp = MagicMock(
            data=[
                {"method": "cash"},
                {"method": "cash"},
                {"method": "cash"},
                {"method": "cash"},
                {"method": "cash"},
                {"method": "line_pay"},
                {"method": "line_pay"},
            ]
        )
        db.execute.side_effect = [shop_resp, confirmations_resp]

        service = PaymentService(db=db)
        result = service.get_payment_methods(shop_id="shop-d4e5f6", user_id=None)

        methods_by_name = {m.method: m for m in result.methods}
        assert methods_by_name["cash"].confirmation_count == 5
        assert methods_by_name["line_pay"].confirmation_count == 2

    def test_includes_user_vote_when_authenticated(self):
        """Authenticated user sees their own vote on each method."""
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.single.return_value = db
        db.maybe_single.return_value = db

        shop_resp = MagicMock(data={"payment_methods": {"cash": True}})
        confirmations_resp = MagicMock(
            data=[
                {"method": "cash"},
                {"method": "cash"},
                {"method": "cash"},
            ]
        )
        user_votes_resp = MagicMock(
            data=[
                {"method": "cash", "vote": True},
            ]
        )
        db.execute.side_effect = [shop_resp, confirmations_resp, user_votes_resp]

        service = PaymentService(db=db)
        result = service.get_payment_methods(shop_id="shop-d4e5f6", user_id="user-a1b2c3")

        methods_by_name = {m.method: m for m in result.methods}
        assert methods_by_name["cash"].user_vote is True

    def test_empty_jsonb_returns_no_methods(self):
        """Shop with empty payment_methods JSONB returns empty list."""
        db = MagicMock()
        db.table.return_value = db
        db.select.return_value = db
        db.eq.return_value = db
        db.single.return_value = db

        shop_resp = MagicMock(data={"payment_methods": {}})
        confirmations_resp = MagicMock(data=[])
        db.execute.side_effect = [shop_resp, confirmations_resp]

        service = PaymentService(db=db)
        result = service.get_payment_methods(shop_id="shop-d4e5f6", user_id=None)

        assert result.methods == []


class TestUpsertConfirmation:
    """When a user taps 'Yes' or 'No' on a payment method chip."""

    def test_inserts_new_confirmation(self):
        """First confirmation for this method by this user."""
        db = MagicMock()
        db.table.return_value = db
        db.upsert.return_value = db
        db.select.return_value = db
        db.eq.return_value = db

        upsert_resp = MagicMock(data=[{"id": "conf-1", "method": "cash", "vote": True}])
        count_resp = MagicMock(
            data=[
                {"id": "c1"},
                {"id": "c2"},
                {"id": "c3"},
                {"id": "c4"},
            ]
        )
        db.execute.side_effect = [upsert_resp, count_resp]

        service = PaymentService(db=db)
        result = service.upsert_confirmation(
            shop_id="shop-d4e5f6", user_id="user-a1b2c3", method="cash", vote=True
        )

        assert result.method == "cash"
        assert result.vote is True
        assert result.confirmation_count == 4
