from datetime import datetime
from unittest.mock import MagicMock

import pytest
from postgrest.exceptions import APIError

from services.lists_service import ListsService


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    return client


@pytest.fixture
def lists_service(mock_supabase):
    return ListsService(db=mock_supabase)


class TestListsService:
    async def test_create_list_succeeds(self, lists_service, mock_supabase):
        """create() just inserts — no manual count check."""
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
                    "id": "l1",
                    "user_id": "user-1",
                    "name": "Favorites",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }]))
            ))
        ))
        result = await lists_service.create(user_id="user-1", name="Favorites")
        assert result.name == "Favorites"
        # Should only call insert — no SELECT count query
        table_calls = [c[0][0] for c in mock_supabase.table.call_args_list]
        assert table_calls == ["lists"]

    async def test_create_list_catches_trigger_violation(self, lists_service, mock_supabase):
        """DB trigger raises check_violation when >= 3 lists. Service catches and re-raises."""
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(side_effect=APIError({
                    "message": "Maximum of 3 lists allowed",
                    "code": "23514",
                    "details": None,
                    "hint": None,
                }))
            ))
        ))
        with pytest.raises(ValueError, match="Maximum of 3 lists"):
            await lists_service.create(user_id="user-1", name="Fourth")

    async def test_delete_list_succeeds(self, lists_service, mock_supabase):
        """delete() only touches lists table (CASCADE handles list_items), no ownership SELECT."""
        mock_delete = MagicMock(return_value=MagicMock(
            eq=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{"id": "l1"}]))
            ))
        ))
        mock_supabase.table = MagicMock(return_value=MagicMock(delete=mock_delete))
        await lists_service.delete(list_id="l1")
        # Should only touch lists — CASCADE handles list_items, no SELECT for ownership
        table_calls = [c[0][0] for c in mock_supabase.table.call_args_list]
        assert table_calls == ["lists"]

    async def test_delete_list_raises_if_not_found_or_unauthorized(self, lists_service, mock_supabase):
        """delete() raises ValueError when RLS blocks the delete (0 rows affected)."""
        mock_delete = MagicMock(return_value=MagicMock(
            eq=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[]))
            ))
        ))
        mock_supabase.table = MagicMock(return_value=MagicMock(delete=mock_delete))
        with pytest.raises(ValueError, match="not found or access denied"):
            await lists_service.delete(list_id="l1")

    async def test_add_shop_no_user_id_param(self, lists_service, mock_supabase):
        """add_shop() no longer takes user_id — RLS enforces ownership."""
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
                    "list_id": "l1",
                    "shop_id": "s1",
                    "added_at": datetime.now().isoformat(),
                }]))
            ))
        ))
        # Note: no user_id parameter
        result = await lists_service.add_shop(list_id="l1", shop_id="s1")
        assert result.shop_id == "s1"

    async def test_remove_shop_no_user_id_param(self, lists_service, mock_supabase):
        """remove_shop() no longer takes user_id — RLS enforces ownership."""
        mock_supabase.table = MagicMock(return_value=MagicMock(
            delete=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    eq=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=MagicMock(data=[]))
                    ))
                ))
            ))
        ))
        # Note: no user_id parameter
        await lists_service.remove_shop(list_id="l1", shop_id="s1")

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
