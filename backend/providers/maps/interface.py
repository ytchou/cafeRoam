from typing import Protocol

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
        profile: str,
    ) -> DirectionsResult | None: ...

    async def close(self) -> None: ...
