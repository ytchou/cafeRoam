from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app

client = TestClient(app)

_ADMIN_ID = "a7f3c2e1-4b58-4d9a-8c6e-123456789abc"


def _admin_user():
    return {"id": _ADMIN_ID}


def test_spend_history_returns_empty_when_no_rows():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.get("/admin/pipeline/spend/history?days=14")
        assert response.status_code == 200
        data = response.json()
        assert data == {"history": []}
    finally:
        app.dependency_overrides.clear()


def test_spend_history_groups_by_date_and_provider():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        rows = [
            {
                "provider": "anthropic",
                "cost_usd": "1.500000",
                "compute_units": None,
                "created_at": "2026-04-10T10:00:00+00:00",
            },
            {
                "provider": "openai",
                "cost_usd": "0.250000",
                "compute_units": None,
                "created_at": "2026-04-10T11:00:00+00:00",
            },
            {
                "provider": "anthropic",
                "cost_usd": "0.800000",
                "compute_units": None,
                "created_at": "2026-04-11T09:00:00+00:00",
            },
        ]
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = (
            MagicMock(data=rows)
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            mock_settings.apify_cost_per_cu = 0.0003
            response = client.get("/admin/pipeline/spend/history?days=14")
        assert response.status_code == 200
        history = response.json()["history"]
        assert len(history) == 2

        apr10 = next(e for e in history if e["date"] == "2026-04-10")
        assert round(apr10["providers"]["anthropic"], 4) == 1.5
        assert round(apr10["providers"]["openai"], 4) == 0.25
        assert apr10["providers"].get("apify", 0.0) == 0.0

        apr11 = next(e for e in history if e["date"] == "2026-04-11")
        assert round(apr11["providers"]["anthropic"], 4) == 0.8
    finally:
        app.dependency_overrides.clear()


def test_spend_history_computes_apify_cost_from_compute_units():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        rows = [
            {
                "provider": "apify",
                "cost_usd": None,
                "compute_units": "10.000000",
                "created_at": "2026-04-10T12:00:00+00:00",
            },
        ]
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = (
            MagicMock(data=rows)
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            mock_settings.apify_cost_per_cu = 0.0003
            response = client.get("/admin/pipeline/spend/history?days=14")
        assert response.status_code == 200
        history = response.json()["history"]
        assert len(history) == 1
        assert round(history[0]["providers"]["apify"], 6) == round(10.0 * 0.0003, 6)
    finally:
        app.dependency_overrides.clear()


def test_spend_history_days_param_caps_at_90():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.get("/admin/pipeline/spend/history?days=999")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()
