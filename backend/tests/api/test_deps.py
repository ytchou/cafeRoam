import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

from api.deps import require_shop_owner


class TestRequireShopOwner:
    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        return db

    def test_verified_owner_passes(self, mock_db):
        """Given a user with an approved claim for this shop, access is granted"""
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "id": "claim-uuid"
        }
        user = {"id": "user-uuid"}
        result = require_shop_owner(
            shop_id="shop-uuid",
            user=user,
            db=mock_db,
        )
        assert result == user

    def test_no_approved_claim_raises_403(self, mock_db):
        """Given a user without an approved claim, access is denied"""
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        with pytest.raises(HTTPException) as exc:
            require_shop_owner(
                shop_id="shop-uuid",
                user={"id": "other-user"},
                db=mock_db,
            )
        assert exc.value.status_code == 403

    def test_checks_specific_shop_id(self, mock_db):
        """The claim check is scoped to the specific shop_id, not any shop"""
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        with pytest.raises(HTTPException):
            require_shop_owner(
                shop_id="different-shop-uuid",
                user={"id": "user-uuid"},
                db=mock_db,
            )
        # Verify .eq("shop_id", "different-shop-uuid") was called
        first_eq_call = mock_db.table.return_value.select.return_value.eq.call_args_list[0]
        assert first_eq_call.args == ("shop_id", "different-shop-uuid")
