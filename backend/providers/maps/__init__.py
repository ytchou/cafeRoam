from core.config import settings
from providers.maps.interface import MapsProvider


def get_maps_provider() -> MapsProvider:
    match settings.maps_provider:
        case "mapbox":
            from providers.maps.mapbox_adapter import MapboxMapsAdapter

            return MapboxMapsAdapter(access_token=settings.mapbox_access_token)
        case _:
            raise ValueError(f"Unknown maps provider: {settings.maps_provider}")
