# backend/tests/test_profile_service.py
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any, cast

import pytest

from services.profile_service import ProfileService
from models.types import ProfileResponse


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


class TestGetProfile:
    @pytest.mark.asyncio
    async def test_returns_profile_with_counts(self, mock_db: MagicMock):
        user_id = "user-123"

        # Use side_effect to return distinct mocks per table("...") call
        profile_table = MagicMock()
        stamp_table = MagicMock()
        checkin_table = MagicMock()

        mock_db.table.side_effect = [profile_table, stamp_table, checkin_table]

        # Mock profiles query
        profile_table.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "display_name": "Mei-Ling",
            "avatar_url": "https://example.com/avatar.jpg",
        }
        # Mock stamp count
        stamp_table.select.return_value.eq.return_value.execute.return_value.count = 12
        # Mock checkin count
        checkin_table.select.return_value.eq.return_value.execute.return_value.count = 8

        service = ProfileService(db=mock_db)
        result = await service.get_profile(user_id)

        assert isinstance(result, ProfileResponse)
        assert result.display_name == "Mei-Ling"
        assert result.stamp_count == 12
        assert result.checkin_count == 8

    @pytest.mark.asyncio
    async def test_returns_zero_counts_for_new_user(self, mock_db: MagicMock):
        user_id = "user-new"
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "display_name": None,
            "avatar_url": None,
        }
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.count = 0

        service = ProfileService(db=mock_db)
        result = await service.get_profile(user_id)

        assert result.display_name is None
        assert result.stamp_count == 0
        assert result.checkin_count == 0


class TestUpdateProfile:
    @pytest.mark.asyncio
    async def test_updates_display_name(self, mock_db: MagicMock):
        user_id = "user-123"
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            {"display_name": "New Name", "avatar_url": None}
        ]

        service = ProfileService(db=mock_db)
        await service.update_profile(user_id, display_name="New Name")

        mock_db.table.return_value.update.assert_called()

    @pytest.mark.asyncio
    async def test_update_with_empty_data_raises(self, mock_db: MagicMock):
        service = ProfileService(db=mock_db)
        with pytest.raises(ValueError, match="No fields to update"):
            await service.update_profile("user-123")
