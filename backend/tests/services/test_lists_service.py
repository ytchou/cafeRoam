from datetime import datetime
from unittest.mock import MagicMock

import pytest

from services.lists_service import ListsService

MAX_LISTS = 3


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    return client


@pytest.fixture
def lists_service(mock_supabase):
    return ListsService(db=mock_supabase)


class TestListsService:
    async def test_create_list_succeeds_when_under_cap(self, lists_service, mock_supabase):
        # User has 1 existing list
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(data=[{"id": "l1"}], count=1))
                ))
            )),
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
                    "id": "l2",
                    "user_id": "user-1",
                    "name": "Favorites",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }]))
            )),
        ))
        result = await lists_service.create(user_id="user-1", name="Favorites")
        assert result.name == "Favorites"

    async def test_create_list_fails_at_cap(self, lists_service, mock_supabase):
        # User already has 3 lists
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(
                        data=[{"id": "l1"}, {"id": "l2"}, {"id": "l3"}],
                        count=3,
                    ))
                ))
            ))
        ))
        with pytest.raises(ValueError, match="Maximum 3 lists"):
            await lists_service.create(user_id="user-1", name="Fourth")

    async def test_delete_list_owned_by_user(self, lists_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            delete=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    eq=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data=[{"id": "l1"}]))
                    ))
                ))
            ))
        ))
        await lists_service.delete(list_id="l1", user_id="user-1")
        mock_supabase.table.assert_called()

    async def test_add_shop_to_list(self, lists_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
                    "list_id": "l1",
                    "shop_id": "s1",
                    "added_at": datetime.now().isoformat(),
                }]))
            ))
        ))
        await lists_service.add_shop(list_id="l1", shop_id="s1", user_id="user-1")

    async def test_get_by_user(self, lists_service, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    order=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data=[]))
                    ))
                ))
            ))
        ))
        results = await lists_service.get_by_user("user-1")
        assert isinstance(results, list)
