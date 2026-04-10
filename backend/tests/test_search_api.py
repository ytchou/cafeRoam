"""Tests for GET /search/suggest endpoint."""

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from api.deps import get_optional_user_db
from main import app


def _make_client(db: MagicMock) -> TestClient:
    app.dependency_overrides[get_optional_user_db] = lambda: db
    return TestClient(app)


def _make_db(tag_rows: list[dict] | None = None) -> MagicMock:
    """Build a mock Supabase client that returns tag_rows from taxonomy_tags query."""
    db = MagicMock()
    result = MagicMock()
    result.data = tag_rows or []
    db.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute.return_value = result
    return db


class TestSuggestEndpoint:
    def setup_method(self):
        app.dependency_overrides.clear()

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_suggest_returns_200_with_results(self):
        """Given a query that matches curated completions, the endpoint returns completions and tags."""
        db = _make_db(tag_rows=[{"id": "tag-1", "label_zh": "安靜"}])
        client = _make_client(db)

        response = client.get("/search/suggest?q=安靜")

        assert response.status_code == 200
        data = response.json()
        assert "completions" in data
        assert "tags" in data
        assert isinstance(data["completions"], list)
        assert isinstance(data["tags"], list)

    def test_suggest_empty_q_returns_empty(self):
        """Given an empty query string, the endpoint returns empty completions and tags."""
        db = _make_db()
        client = _make_client(db)

        response = client.get("/search/suggest?q=")

        assert response.status_code == 200
        data = response.json()
        assert data["completions"] == []
        assert data["tags"] == []

    def test_suggest_missing_q_defaults_to_empty(self):
        """Given no q param, the endpoint defaults to empty query and returns empty results."""
        db = _make_db()
        client = _make_client(db)

        response = client.get("/search/suggest")

        assert response.status_code == 200
        data = response.json()
        assert data["completions"] == []
        assert data["tags"] == []
