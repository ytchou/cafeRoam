import logging
from typing import Any

import httpx
import posthog as posthog_module

logger = logging.getLogger(__name__)

_HOGQL_QUERY_URL = "https://us.posthog.com/api/projects/{project_id}/query/"


def _on_error(error: Exception, items: list) -> None:
    logger.warning("PostHog flush error: %s (%d items dropped)", error, len(items))


class PostHogAnalyticsAdapter:
    def __init__(self, api_key: str, host: str, project_id: str = ""):
        self._api_key = api_key
        self._project_id = project_id
        self._client = posthog_module.Client(
            project_api_key=api_key,
            host=host,
            debug=False,
            on_error=_on_error,
        )

    def track(
        self,
        event: str,
        properties: dict[str, str | int | bool | None] | None = None,
        *,
        distinct_id: str | None = None,
    ) -> None:
        try:
            self._client.capture(
                distinct_id=distinct_id or "server",
                event=event,
                properties=properties,
            )
        except Exception:
            logger.warning("PostHog track failed for event: %s", event, exc_info=True)

    def identify(
        self, user_id: str, traits: dict[str, str | int | bool | None] | None = None
    ) -> None:
        try:
            self._client.identify(
                distinct_id=user_id,
                properties=traits,
            )
        except Exception:
            logger.warning("PostHog identify failed", exc_info=True)

    def page(
        self,
        name: str | None = None,
        properties: dict[str, str | int | bool | None] | None = None,
    ) -> None:
        try:
            self._client.capture(
                distinct_id="server",
                event="$pageview",
                properties={"$current_url": name, **(properties or {})},
            )
        except Exception:
            logger.warning("PostHog page failed for: %s", name, exc_info=True)

    def query_hogql(self, hogql: str) -> list[dict[str, Any]]:
        """Execute a HogQL query against the PostHog Query API."""
        if not self._project_id:
            logger.warning("PostHog project_id not configured — skipping HogQL query")
            return []
        try:
            url = _HOGQL_QUERY_URL.format(project_id=self._project_id)
            resp = httpx.post(
                url,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={"query": {"kind": "HogQLQuery", "query": hogql}},
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
            columns = data.get("columns")
            results = data.get("results")
            if columns is None or results is None:
                logger.warning("Unexpected PostHog response shape: %s", list(data.keys()))
                return []
            return [dict(zip(columns, row, strict=True)) for row in results]
        except Exception:
            logger.warning("PostHog HogQL query failed", exc_info=True)
            return []
