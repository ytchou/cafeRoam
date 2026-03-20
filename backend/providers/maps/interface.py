from typing import Literal, Protocol

from models.types import DirectionsResult, GeocodingResult


class MapsProvider(Protocol):
    async def geocode(self, address: str) -> GeocodingResult | None: ...

    async def reverse_geocode(self, lat: float, lng: float) -> str | None: ...

    async def get_directions(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        profile: Literal["walking", "driving-traffic"],
    ) -> DirectionsResult | None: ...

    async def close(self) -> None: ...
