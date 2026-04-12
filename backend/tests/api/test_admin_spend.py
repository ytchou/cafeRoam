"""Tests for GET /admin/pipeline/spend endpoint."""

import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app

client = TestClient(app)

_ADMIN_ID = "a7f3c2e1-4b58-4d9a-8c6e-999999999abc"


def _admin_user() -> dict:
    return {"id": _ADMIN_ID, "app_metadata": {}}


class TestSpendEndpoint:
    """Admin spend dashboard — aggregated API cost by provider."""

    def test_spend_returns_aggregated_totals(self):
        """Given 3 rows in api_usage_log (anthropic, openai, apify), the spend endpoint
        returns today_total_usd and correct per-provider totals."""
        mock_db = MagicMock()
        today = datetime.date.today().isoformat()
        mock_rows = [
            {
                "provider": "anthropic",
                "task": "enrich_shop",
                "cost_usd": 0.0150,
                "compute_units": None,
                "tokens_input": 1200,
                "tokens_output": 150,
                "created_at": f"{today}T10:00:00+00:00",
            },
            {
                "provider": "openai",
                "task": "embed",
                "cost_usd": 0.0056,
                "compute_units": None,
                "tokens_input": 800,
                "tokens_output": 0,
                "created_at": f"{today}T10:01:00+00:00",
            },
            {
                "provider": "apify",
                "task": "scrape_batch",
                "cost_usd": None,
                "compute_units": 5.0,
                "tokens_input": None,
                "tokens_output": None,
                "created_at": f"{today}T10:02:00+00:00",
            },
        ]
        mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = (
            MagicMock(data=mock_rows)
        )
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            with (
                patch("api.deps.settings") as mock_settings,
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.admin.settings") as mock_admin_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                mock_admin_settings.admin_user_ids = [_ADMIN_ID]
                mock_admin_settings.apify_cost_per_cu = 0.004
                response = client.get("/admin/pipeline/spend")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        # apify: 5.0 * 0.004 = 0.02; anthropic: 0.015; openai: 0.0056 → total ≈ 0.0406
        assert data["today_total_usd"] == pytest.approx(0.0406, abs=1e-4)
        assert data["mtd_total_usd"] == pytest.approx(0.0406, abs=1e-4)
        provider_names = {p["provider"] for p in data["providers"]}
        assert "anthropic" in provider_names
        assert "openai" in provider_names
        assert "apify" in provider_names

        # Task-level token aggregation
        anthropic_tasks = {
            t["task"]: t
            for p in data["providers"]
            if p["provider"] == "anthropic"
            for t in p["tasks"]
        }
        assert anthropic_tasks["enrich_shop"]["today_tokens_in"] == 1200
        assert anthropic_tasks["enrich_shop"]["today_tokens_out"] == 150
        assert anthropic_tasks["enrich_shop"]["mtd_tokens_in"] == 1200
        assert anthropic_tasks["enrich_shop"]["mtd_tokens_out"] == 150

        openai_tasks = {
            t["task"]: t
            for p in data["providers"]
            if p["provider"] == "openai"
            for t in p["tasks"]
        }
        assert openai_tasks["embed"]["today_tokens_in"] == 800
        assert openai_tasks["embed"]["today_tokens_out"] == 0

        # Apify has no tokens — should aggregate as zero
        apify_tasks = {
            t["task"]: t
            for p in data["providers"]
            if p["provider"] == "apify"
            for t in p["tasks"]
        }
        assert apify_tasks["scrape_batch"]["today_tokens_in"] == 0
        assert apify_tasks["scrape_batch"]["today_tokens_out"] == 0

    def test_spend_returns_403_for_non_admin(self):
        """A non-admin user receives 403 when accessing the spend endpoint."""
        app.dependency_overrides[get_current_user] = lambda: {
            "id": "regular-user-456",
            "app_metadata": {},
        }
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/spend")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 403

    def test_spend_empty_table_returns_zeros(self):
        """When api_usage_log is empty, the spend endpoint returns zeros."""
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            with (
                patch("api.deps.settings") as mock_settings,
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.admin.settings") as mock_admin_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                mock_admin_settings.admin_user_ids = [_ADMIN_ID]
                mock_admin_settings.apify_cost_per_cu = 0.004
                response = client.get("/admin/pipeline/spend")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["today_total_usd"] == 0.0
        assert data["mtd_total_usd"] == 0.0
        assert data["providers"] == []
