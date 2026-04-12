# backend/tests/providers/test_api_usage_logger.py
from unittest.mock import MagicMock, patch

import providers.api_usage_logger as usage_logger


def test_log_inserts_correct_row():
    mock_db = MagicMock()
    with patch.object(usage_logger, "get_service_role_client", return_value=mock_db):
        usage_logger.log_api_usage(
            provider="anthropic",
            task="enrich_shop",
            model="claude-sonnet-4-6",
            tokens_input=1000,
            tokens_output=500,
            tokens_cache_write=200,
            tokens_cache_read=50,
            cost_usd=0.0105,
        )

    mock_db.table.assert_called_once_with("api_usage_log")
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["provider"] == "anthropic"
    assert inserted["task"] == "enrich_shop"
    assert inserted["model"] == "claude-sonnet-4-6"
    assert inserted["tokens_input"] == 1000
    assert inserted["tokens_output"] == 500
    assert inserted["tokens_cache_write"] == 200
    assert inserted["tokens_cache_read"] == 50
    assert inserted["cost_usd"] == 0.0105
    assert inserted["compute_units"] is None


def test_log_apify_row_has_compute_units():
    mock_db = MagicMock()
    with patch.object(usage_logger, "get_service_role_client", return_value=mock_db):
        usage_logger.log_api_usage(
            provider="apify",
            task="scrape_batch",
            compute_units=3.5,
        )

    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["provider"] == "apify"
    assert inserted["compute_units"] == 3.5
    assert inserted["cost_usd"] is None
    assert inserted["tokens_input"] is None


def test_log_never_raises_on_db_error():
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.side_effect = Exception("DB down")
    with patch.object(usage_logger, "get_service_role_client", return_value=mock_db):
        # Must not raise despite DB failure
        usage_logger.log_api_usage(
            provider="openai", task="embed", tokens_input=100, cost_usd=0.001
        )


def test_log_never_raises_on_client_error():
    with patch.object(
        usage_logger, "get_service_role_client", side_effect=RuntimeError("No client")
    ):
        # Must not raise even if client construction fails
        usage_logger.log_api_usage(provider="openai", task="embed", tokens_input=100)
