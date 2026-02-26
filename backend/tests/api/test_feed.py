from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_activity_feed_is_public(client):
    mock_db = MagicMock()
    mock_chain = mock_db.table.return_value.select.return_value.order.return_value
    mock_chain.limit.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "ev-1",
                "event_type": "shop_added",
                "actor_id": None,
                "shop_id": "shop-1",
                "metadata": {"shop_name": "Test Cafe"},
                "created_at": "2026-02-26T00:00:00Z",
            }
        ]
    )

    with patch("api.feed.get_service_role_client", return_value=mock_db):
        response = client.get("/feed")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["event_type"] == "shop_added"


def test_activity_feed_default_limit(client):
    mock_db = MagicMock()
    mock_chain = mock_db.table.return_value.select.return_value.order.return_value
    mock_chain.limit.return_value.execute.return_value = MagicMock(data=[])

    with patch("api.feed.get_service_role_client", return_value=mock_db):
        response = client.get("/feed")

    assert response.status_code == 200
    # Verify limit was called with default 20
    mock_db.table.return_value.select.return_value.order.return_value.limit.assert_called_once_with(
        20
    )
