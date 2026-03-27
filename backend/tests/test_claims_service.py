from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from services.claims_service import ClaimsService

SHOP_ID = "shop-abc"
USER_ID = "user-xyz"
CLAIM_ID = "claim-111"


def _make_service(*, existing_claims=None, insert_row=None):
    """Build a ClaimsService with mocked DB and email."""
    db = MagicMock()
    email = AsyncMock()

    # Track per-table call counts separately to avoid fragile global ordering.
    shop_claims_calls = {"n": 0}

    def table_side(name):
        mock = MagicMock()
        if name == "shops":
            # Shop name lookup in submit_claim
            mock.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"name": "Fika Fika Cafe"}
            ]
        elif name == "shop_claims":
            shop_claims_calls["n"] += 1
            if shop_claims_calls["n"] == 1:
                # Duplicate check
                dup_chain = MagicMock()
                dup_chain.execute.return_value.data = existing_claims or []
                mock.select.return_value.eq.return_value.in_.return_value = dup_chain
            else:
                # Insert
                ins_chain = MagicMock()
                ins_chain.execute.return_value.data = [insert_row or {"id": CLAIM_ID}]
                mock.insert.return_value = ins_chain
        elif name == "user_roles":
            mock.upsert.return_value.execute.return_value.data = [{"id": "role-1"}]
        return mock

    db.table.side_effect = table_side
    svc = ClaimsService(db=db, email=email)
    return svc, db, email


class TestSubmitClaim:
    @pytest.mark.asyncio
    async def test_submit_creates_claim_record(self):
        svc, db, email = _make_service(existing_claims=[], insert_row={"id": CLAIM_ID})

        result = await svc.submit_claim(
            user_id=USER_ID,
            shop_id=SHOP_ID,
            contact_name="Alice Chen",
            contact_email="alice@caferoam.tw",
            role="owner",
            proof_photo_path="claim-proofs/shop-abc/proof.jpg",
        )
        assert result["id"] == CLAIM_ID

    @pytest.mark.asyncio
    async def test_submit_raises_409_if_active_claim_exists(self):
        svc, db, email = _make_service(
            existing_claims=[{"id": "existing-claim", "status": "pending"}]
        )

        with pytest.raises(HTTPException) as exc:
            await svc.submit_claim(
                user_id=USER_ID,
                shop_id=SHOP_ID,
                contact_name="Bob Lin",
                contact_email="bob@example.com",
                role="manager",
                proof_photo_path="claim-proofs/shop-abc/proof.jpg",
            )
        assert exc.value.status_code == 409

    @pytest.mark.asyncio
    async def test_submit_sends_confirmation_and_admin_emails(self):
        svc, db, email = _make_service(existing_claims=[], insert_row={"id": CLAIM_ID})

        await svc.submit_claim(
            user_id=USER_ID,
            shop_id=SHOP_ID,
            contact_name="Alice Chen",
            contact_email="alice@caferoam.tw",
            role="owner",
            proof_photo_path="claim-proofs/shop-abc/proof.jpg",
        )
        assert email.send.call_count == 2


class TestApproveClaim:
    @pytest.mark.asyncio
    async def test_approve_updates_status_and_sends_email(self):
        db = MagicMock()
        email = AsyncMock()

        # get claim
        claim_data = {
            "id": CLAIM_ID,
            "shop_id": SHOP_ID,
            "user_id": USER_ID,
            "status": "pending",
            "contact_email": "alice@caferoam.tw",
            "contact_name": "Alice Chen",
        }
        get_chain = MagicMock()
        get_chain.execute.return_value.data = claim_data

        # update + user_roles
        update_chain = MagicMock()
        update_chain.execute.return_value.data = [{}]
        role_chain = MagicMock()
        role_chain.execute.return_value.data = [{}]

        call_count = {"n": 0}

        def table_side(name):
            call_count["n"] += 1
            mock = MagicMock()
            if name == "shop_claims" and call_count["n"] == 1:
                mock.select.return_value.eq.return_value.single.return_value = get_chain
            elif name == "shop_claims" and call_count["n"] == 2:
                mock.update.return_value.eq.return_value = update_chain
            elif name == "user_roles":
                mock.upsert.return_value = role_chain
            return mock

        db.table.side_effect = table_side
        svc = ClaimsService(db=db, email=email)
        await svc.approve_claim(claim_id=CLAIM_ID, admin_user_id="admin-1")
        assert email.send.call_count == 1


class TestRejectClaim:
    @pytest.mark.asyncio
    async def test_reject_updates_status_and_sends_email(self):
        db = MagicMock()
        email = AsyncMock()

        claim_data = {
            "id": CLAIM_ID,
            "shop_id": SHOP_ID,
            "user_id": USER_ID,
            "status": "pending",
            "contact_email": "alice@caferoam.tw",
            "contact_name": "Alice Chen",
        }
        get_chain = MagicMock()
        get_chain.execute.return_value.data = claim_data

        update_chain = MagicMock()
        update_chain.execute.return_value.data = [{}]

        call_count = {"n": 0}

        def table_side(name):
            call_count["n"] += 1
            mock = MagicMock()
            if name == "shop_claims" and call_count["n"] == 1:
                mock.select.return_value.eq.return_value.single.return_value = get_chain
            elif name == "shop_claims" and call_count["n"] == 2:
                mock.update.return_value.eq.return_value = update_chain
            return mock

        db.table.side_effect = table_side
        svc = ClaimsService(db=db, email=email)
        await svc.reject_claim(
            claim_id=CLAIM_ID,
            reason="invalid_proof",
            admin_user_id="admin-1",
        )
        assert email.send.call_count == 1
