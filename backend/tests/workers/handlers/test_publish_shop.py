from unittest.mock import MagicMock

import pytest

from workers.handlers.publish_shop import handle_publish_shop


@pytest.fixture()
def mock_db():
    db = MagicMock()
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
    db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"name": "Test Café", "source": "cafe_nomad"}
    )
    db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])
    return db


@pytest.mark.asyncio
async def test_non_submission_shop_goes_live(mock_db):
    """Non-user-submission shops should be set to 'live' as before."""
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"name": "Test Café", "source": "cafe_nomad"}
    )
    await handle_publish_shop({"shop_id": "shop-1"}, mock_db)

    # Check that shops table was updated to 'live'
    update_calls = mock_db.table.return_value.update.call_args_list
    statuses = [c.args[0].get("processing_status") for c in update_calls if "processing_status" in c.args[0]]
    assert "live" in statuses


@pytest.mark.asyncio
async def test_user_submission_routes_to_pending_review(mock_db):
    """User-submitted shops should land in 'pending_review', not 'live'."""
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"name": "Test Café", "source": "user_submission"}
    )
    await handle_publish_shop(
        {"shop_id": "shop-1", "submission_id": "sub-1", "submitted_by": "user-1"},
        mock_db,
    )

    # Check that shops table was updated to 'pending_review' (NOT 'live')
    update_calls = mock_db.table.return_value.update.call_args_list
    statuses = [c.args[0].get("processing_status") for c in update_calls if "processing_status" in c.args[0]]
    assert "pending_review" in statuses
    assert "live" not in statuses


@pytest.mark.asyncio
async def test_user_submission_updates_submission_status(mock_db):
    """When routed to pending_review, the submission record should also be updated."""
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"name": "Test Café", "source": "user_submission"}
    )
    await handle_publish_shop(
        {"shop_id": "shop-1", "submission_id": "sub-1", "submitted_by": "user-1"},
        mock_db,
    )

    # Verify shop_submissions was updated (at least one update call)
    all_table_calls = [c.args[0] for c in mock_db.table.call_args_list]
    assert "shop_submissions" in all_table_calls


@pytest.mark.asyncio
async def test_user_submission_does_not_emit_activity_feed(mock_db):
    """User submissions routed to pending_review should NOT emit activity feed yet."""
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"name": "Test Café", "source": "user_submission"}
    )
    await handle_publish_shop(
        {"shop_id": "shop-1", "submission_id": "sub-1", "submitted_by": "user-1"},
        mock_db,
    )

    # activity_feed insert should NOT have been called
    all_table_calls = [c.args[0] for c in mock_db.table.call_args_list]
    assert "activity_feed" not in all_table_calls
