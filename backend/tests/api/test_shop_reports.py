from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

SHOP_ID = str(uuid4())


def _mock_shop_exists(mock_db: MagicMock) -> None:
    """Configure mock to simulate shop exists."""
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": SHOP_ID
    }


def _mock_shop_not_found(mock_db: MagicMock) -> None:
    """Configure mock to simulate shop not found."""
    from postgrest.exceptions import APIError

    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = APIError(
        {"message": "not found", "code": "PGRST116", "details": "", "hint": ""}
    )


def _mock_insert_success(mock_db: MagicMock) -> None:
    """Configure mock for successful insert."""
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": str(uuid4())}
    ]


class TestSubmitShopReport:
    @patch("api.shops.get_admin_db")
    def test_anonymous_user_can_submit_report(self, mock_get_db: MagicMock) -> None:
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        _mock_shop_exists(mock_db)
        _mock_insert_success(mock_db)

        response = client.post(
            f"/shops/{SHOP_ID}/report",
            json={"description": "Opening hours are incorrect on weekends"},
        )

        assert response.status_code == 201
        assert response.json()["message"] == "Report submitted"

    @patch("api.shops.get_admin_db")
    def test_authenticated_user_report_includes_user_id(self, mock_get_db: MagicMock) -> None:
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        _mock_shop_exists(mock_db)
        _mock_insert_success(mock_db)

        user_id = str(uuid4())
        with patch("api.shops.get_optional_user", return_value={"id": user_id}):
            response = client.post(
                f"/shops/{SHOP_ID}/report",
                json={
                    "field": "hours",
                    "description": "Closes at 6pm not 8pm on Sundays",
                },
            )

        assert response.status_code == 201
        insert_call = mock_db.table.return_value.insert.call_args
        inserted_data = insert_call[0][0]
        assert inserted_data["user_id"] == user_id
        assert inserted_data["field"] == "hours"

    @patch("api.shops.get_admin_db")
    def test_report_with_empty_description_returns_422(self, mock_get_db: MagicMock) -> None:
        response = client.post(
            f"/shops/{SHOP_ID}/report",
            json={"description": ""},
        )

        assert response.status_code == 422

    @patch("api.shops.get_admin_db")
    def test_report_for_nonexistent_shop_returns_404(self, mock_get_db: MagicMock) -> None:
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        _mock_shop_not_found(mock_db)

        response = client.post(
            f"/shops/{SHOP_ID}/report",
            json={"description": "This shop does not exist"},
        )

        assert response.status_code == 404

    @patch("api.shops.get_admin_db")
    def test_report_with_field_selector(self, mock_get_db: MagicMock) -> None:
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        _mock_shop_exists(mock_db)
        _mock_insert_success(mock_db)

        response = client.post(
            f"/shops/{SHOP_ID}/report",
            json={"field": "wifi", "description": "WiFi password is outdated"},
        )

        assert response.status_code == 201
        insert_call = mock_db.table.return_value.insert.call_args
        inserted_data = insert_call[0][0]
        assert inserted_data["field"] == "wifi"
