from unittest.mock import MagicMock, patch

import pytest

from workers.handlers.account_deletion import delete_expired_accounts


class TestDeleteExpiredAccounts:
    @pytest.mark.asyncio
    async def test_no_expired_profiles_does_nothing(self):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.lt.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()
        mock_db.auth.admin.delete_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_deletes_expired_user_and_storage(self):
        expired_profile = {
            "id": "user-expired",
            "deletion_requested_at": "2026-01-01T00:00:00Z",
        }
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.lt.return_value.execute.return_value = (
            MagicMock(data=[expired_profile])
        )
        mock_db.storage.from_.return_value.list.return_value = [
            {"name": "photo1.jpg"},
            {"name": "photo2.jpg"},
        ]
        mock_db.storage.from_.return_value.remove.return_value = None
        mock_db.auth.admin.delete_user.return_value = None

        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()

        mock_db.storage.from_.assert_called_with("checkin-photos")
        mock_db.storage.from_.return_value.list.assert_called_once_with(path="user-expired")
        mock_db.storage.from_.return_value.remove.assert_called_once_with(
            ["user-expired/photo1.jpg", "user-expired/photo2.jpg"]
        )
        mock_db.auth.admin.delete_user.assert_called_once_with("user-expired")

    @pytest.mark.asyncio
    async def test_continues_on_individual_failure(self):
        """If one user's deletion fails, others should still be processed."""
        profiles = [
            {"id": "user-1", "deletion_requested_at": "2026-01-01T00:00:00Z"},
            {"id": "user-2", "deletion_requested_at": "2026-01-01T00:00:00Z"},
        ]
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.lt.return_value.execute.return_value = (
            MagicMock(data=profiles)
        )
        mock_db.storage.from_.return_value.list.return_value = []
        mock_db.auth.admin.delete_user.side_effect = [Exception("fail"), None]

        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()

        assert mock_db.auth.admin.delete_user.call_count == 2
