import logging

import posthog as posthog_module

logger = logging.getLogger(__name__)


def _on_error(error: Exception, items: list) -> None:
    logger.warning("PostHog flush error: %s (%d items dropped)", error, len(items))


class PostHogAnalyticsAdapter:
    def __init__(self, api_key: str, host: str):
        self._client = posthog_module.Client(
            project_api_key=api_key,
            host=host,
            debug=False,
            on_error=_on_error,
        )

    def track(self, event: str, properties: dict[str, str | int | bool] | None = None) -> None:
        try:
            self._client.capture(
                distinct_id="server",
                event=event,
                properties=properties,
            )
        except Exception:
            logger.warning("PostHog track failed for event: %s", event, exc_info=True)

    def identify(self, user_id: str, traits: dict[str, str | int | bool] | None = None) -> None:
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
        properties: dict[str, str | int | bool] | None = None,
    ) -> None:
        try:
            self._client.capture(
                distinct_id="server",
                event="$pageview",
                properties={"$current_url": name, **(properties or {})},
            )
        except Exception:
            logger.warning("PostHog page failed for: %s", name, exc_info=True)
