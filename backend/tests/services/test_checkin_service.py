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

    async def test_create_inserts_checkin_and_stamp(self, checkin_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
                    "id": "ci-1",
                    "user_id": "user-1",
                    "shop_id": "shop-1",
                    "photo_urls": ["https://example.com/photo.jpg"],
                    "menu_photo_url": None,
                    "note": None,
                    "created_at": datetime.now().isoformat(),
                }]))
            ))
        ))
        result = await checkin_service.create(
            user_id="user-1",
            shop_id="shop-1",
            photo_urls=["https://example.com/photo.jpg"],
        )
        assert result.id == "ci-1"
        # Verify stamp was also created
        assert mock_supabase.table.call_count >= 2  # check_ins + stamps

    async def test_create_with_menu_photo_queues_enrichment(self, checkin_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
                    "id": "ci-1",
                    "user_id": "user-1",
                    "shop_id": "shop-1",
                    "photo_urls": ["https://example.com/photo.jpg"],
                    "menu_photo_url": "https://example.com/menu.jpg",
                    "note": None,
                    "created_at": datetime.now().isoformat(),
                }]))
            ))
        ))
        await checkin_service.create(
            user_id="user-1",
            shop_id="shop-1",
            photo_urls=["https://example.com/photo.jpg"],
            menu_photo_url="https://example.com/menu.jpg",
        )
        # Verify job_queue insert for menu photo enrichment
        calls = mock_supabase.table.call_args_list
        table_names = [c[0][0] for c in calls]
        assert "job_queue" in table_names

    async def test_get_by_user(self, checkin_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    order=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data=[]))
                    ))
                ))
            ))
        ))
        results = await checkin_service.get_by_user("user-1")
        assert isinstance(results, list)

    async def test_get_by_shop(self, checkin_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    order=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data=[]))
                    ))
                ))
            ))
        ))
        results = await checkin_service.get_by_shop("shop-1")
        assert isinstance(results, list)
