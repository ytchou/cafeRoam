from datetime import datetime
from unittest.mock import MagicMock

import pytest

from services.checkin_service import CheckInService


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    return client


@pytest.fixture
def checkin_service(mock_supabase):
    return CheckInService(db=mock_supabase)


class TestCheckInService:
    async def test_create_requires_at_least_one_photo(self, checkin_service):
        with pytest.raises(ValueError, match="At least one photo"):
            await checkin_service.create(
                user_id="user-1",
                shop_id="shop-1",
                photo_urls=[],
            )

    async def test_create_only_inserts_checkin_row(self, checkin_service, mock_supabase):
        """After trigger migration: create() should ONLY insert into check_ins.
        Stamp creation and job queueing are handled by the DB trigger."""
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                insert=MagicMock(
                    return_value=MagicMock(
                        execute=MagicMock(
                            return_value=MagicMock(
                                data=[
                                    {
                                        "id": "ci-1",
                                        "user_id": "user-1",
                                        "shop_id": "shop-1",
                                        "photo_urls": ["https://example.com/photo.jpg"],
                                        "menu_photo_url": None,
                                        "note": None,
                                        "created_at": datetime.now().isoformat(),
                                    }
                                ]
                            )
                        )
                    )
                )
            )
        )
        result = await checkin_service.create(
            user_id="user-1",
            shop_id="shop-1",
            photo_urls=["https://example.com/photo.jpg"],
        )
        assert result.id == "ci-1"
        # Service should only call table("check_ins") — NOT stamps or job_queue
        table_calls = [c[0][0] for c in mock_supabase.table.call_args_list]
        assert table_calls == ["check_ins"]

    async def test_create_with_menu_photo_still_only_inserts_checkin(
        self, checkin_service, mock_supabase
    ):
        """Even with menu_photo_url, service only inserts check_in. Trigger handles job."""
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                insert=MagicMock(
                    return_value=MagicMock(
                        execute=MagicMock(
                            return_value=MagicMock(
                                data=[
                                    {
                                        "id": "ci-1",
                                        "user_id": "user-1",
                                        "shop_id": "shop-1",
                                        "photo_urls": ["https://example.com/photo.jpg"],
                                        "menu_photo_url": "https://example.com/menu.jpg",
                                        "note": None,
                                        "created_at": datetime.now().isoformat(),
                                    }
                                ]
                            )
                        )
                    )
                )
            )
        )
        await checkin_service.create(
            user_id="user-1",
            shop_id="shop-1",
            photo_urls=["https://example.com/photo.jpg"],
            menu_photo_url="https://example.com/menu.jpg",
        )
        table_calls = [c[0][0] for c in mock_supabase.table.call_args_list]
        assert table_calls == ["check_ins"]

    async def test_get_by_user(self, checkin_service, mock_supabase):
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                order=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(return_value=MagicMock(data=[]))
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
        results = await checkin_service.get_by_user("user-1")
        assert isinstance(results, list)

    async def test_get_by_shop(self, checkin_service, mock_supabase):
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                order=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(return_value=MagicMock(data=[]))
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
        results = await checkin_service.get_by_shop("shop-1")
        assert isinstance(results, list)
