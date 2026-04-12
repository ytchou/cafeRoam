import logging

from db.supabase_client import get_service_role_client

logger = logging.getLogger(__name__)


def log_api_usage(
    *,
    provider: str,
    task: str,
    model: str | None = None,
    tokens_input: int | None = None,
    tokens_output: int | None = None,
    tokens_cache_write: int | None = None,
    tokens_cache_read: int | None = None,
    compute_units: float | None = None,
    cost_usd: float | None = None,
) -> None:
    """Insert one api_usage_log row. Never raises — observability must not interrupt enrichment."""
    try:
        db = get_service_role_client()
        db.table("api_usage_log").insert(
            {
                "provider": provider,
                "task": task,
                "model": model,
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "tokens_cache_write": tokens_cache_write,
                "tokens_cache_read": tokens_cache_read,
                "compute_units": compute_units,
                "cost_usd": cost_usd,
            }
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to log API usage (provider=%s task=%s): %s", provider, task, exc)
