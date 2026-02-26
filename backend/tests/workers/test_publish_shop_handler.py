from unittest.mock import MagicMock

import pytest

from workers.handlers.publish_shop import handle_publish_shop


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    mock_single = db.table.return_value.select.return_value.eq.return_value.single.return_value
    mock_single.execute.return_value = MagicMock(data={"name": "Test Cafe"})
    return db


@pytest.mark.asyncio
async def test_publish_shop_sets_status_live(mock_db):
    payload = {"shop_id": "shop-1"}
    await handle_publish_shop(payload=payload, db=mock_db)

    # Should update shop status to live
    mock_db.table.assert_any_call("shops")
    # No submitted_by — no feed event expected
    feed_calls = [c for c in mock_db.table.call_args_list if c.args == ("activity_feed",)]
    assert not feed_calls, "Should not insert feed event without submitted_by"


@pytest.mark.asyncio
async def test_publish_shop_inserts_feed_event_when_submitted_by(mock_db):
    payload = {"shop_id": "shop-1", "submitted_by": "user-1"}
    await handle_publish_shop(payload=payload, db=mock_db)

    mock_db.table.assert_any_call("activity_feed")


@pytest.mark.asyncio
async def test_publish_shop_updates_submission_status(mock_db):
    payload = {"shop_id": "shop-1", "submission_id": "sub-1", "submitted_by": "user-1"}
    await handle_publish_shop(payload=payload, db=mock_db)

    # Should update submission status to live
    mock_db.table.assert_any_call("shop_submissions")
