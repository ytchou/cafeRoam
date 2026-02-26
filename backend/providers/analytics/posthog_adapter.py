import logging

import posthog

logger = logging.getLogger(__name__)


class PostHogAnalyticsAdapter:
    def __init__(self, api_key: str, host: str):
        posthog.project_api_key = api_key
        posthog.host = host
        posthog.debug = False

    def track(self, event: str, properties: dict[str, str | int | bool] | None = None) -> None:
        try:
            posthog.capture(
                distinct_id="server",
                event=event,
                properties=properties,
            )
        except Exception:
            logger.warning("PostHog track failed for event: %s", event, exc_info=True)

    def identify(self, user_id: str, traits: dict[str, str | int | bool] | None = None) -> None:
        try:
            posthog.identify(
                distinct_id=user_id,
                properties=traits,
            )
        except Exception:
            logger.warning("PostHog identify failed for user: %s", user_id, exc_info=True)

    def page(
        self,
        name: str | None = None,
        properties: dict[str, str | int | bool] | None = None,
    ) -> None:
        try:
            posthog.capture(
                distinct_id="server",
                event="$pageview",
                properties={"$current_url": name, **(properties or {})},
            )
        except Exception:
            logger.warning("PostHog page failed for: %s", name, exc_info=True)
