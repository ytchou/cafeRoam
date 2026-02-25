from unittest.mock import MagicMock, call, patch

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
    async def test_deletes_expired_user_checkin_and_menu_photos(self):
        """Deletes both check-in photos and menu photos before hard-deleting the user."""
        expired_profile = {
            "id": "user-expired",
            "deletion_requested_at": "2026-01-01T00:00:00Z",
        }
        mock_db = MagicMock()

        # profiles query
        mock_db.table.return_value.select.return_value.lt.return_value.execute.return_value = (
            MagicMock(data=[expired_profile])
        )
        # check-in photos listing
        mock_db.storage.from_.return_value.list.return_value = [
            {"name": "photo1.jpg"},
            {"name": "photo2.jpg"},
        ]
        mock_db.storage.from_.return_value.remove.return_value = None

        # check_ins menu_photo_url query — chain: table().select().eq().not_.is_().limit().execute()
        checkins_result = MagicMock(
            data=[
                {"menu_photo_url": "https://proj.supabase.co/storage/v1/object/public/menu-photos/user-expired/m1.jpg"},
            ]
        )
        mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.limit.return_value.execute.return_value = (
            checkins_result
        )

        mock_db.auth.admin.delete_user.return_value = None

        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()

        # Check-in photos bucket
        mock_db.storage.from_.assert_any_call("checkin-photos")
        mock_db.storage.from_.return_value.list.assert_called_once_with(
            path="user-expired", options={"limit": 10000}
        )
        mock_db.auth.admin.delete_user.assert_called_once_with("user-expired")

    @pytest.mark.asyncio
    async def test_storage_failure_prevents_hard_delete(self):
        """If storage deletion fails, the user auth record is NOT deleted (retry next run)."""
        expired_profile = {
            "id": "user-1",
            "deletion_requested_at": "2026-01-01T00:00:00Z",
        }
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.lt.return_value.execute.return_value = (
            MagicMock(data=[expired_profile])
        )
        mock_db.storage.from_.return_value.list.side_effect = RuntimeError("Storage unavailable")

        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()

        mock_db.auth.admin.delete_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_unparseable_menu_url_prevents_hard_delete(self):
        """If a menu photo URL cannot be parsed, storage deletion aborts and user is NOT deleted."""
        expired_profile = {
            "id": "user-1",
            "deletion_requested_at": "2026-01-01T00:00:00Z",
        }
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.lt.return_value.execute.return_value = (
            MagicMock(data=[expired_profile])
        )
        mock_db.storage.from_.return_value.list.return_value = []
        # Menu photo with an unrecognized URL scheme/format
        mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.limit.return_value.execute.return_value = (
            MagicMock(data=[{"menu_photo_url": "https://cdn.example.com/photos/photo.jpg"}])
        )

        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()

        mock_db.auth.admin.delete_user.assert_not_called()

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
        mock_db.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.limit.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        mock_db.auth.admin.delete_user.side_effect = [Exception("fail"), None]

        with patch(
            "workers.handlers.account_deletion.get_service_role_client",
            return_value=mock_db,
        ):
            await delete_expired_accounts()

        assert mock_db.auth.admin.delete_user.call_count == 2
