from typing import Any, Protocol


class AnalyticsProvider(Protocol):
    def track(
        self,
        event: str,
        properties: dict[str, str | int | bool | list[str] | None] | None = None,
        *,
        distinct_id: str | None = None,
    ) -> None: ...

    def identify(
        self, user_id: str, traits: dict[str, str | int | bool | None] | None = None
    ) -> None: ...

    def page(
        self,
        name: str | None = None,
        properties: dict[str, str | int | bool | None] | None = None,
    ) -> None: ...

    def query_hogql(self, hogql: str) -> list[dict[str, Any]]: ...
