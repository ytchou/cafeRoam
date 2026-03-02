from dataclasses import dataclass


@dataclass(frozen=True)
class GeoBounds:
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float

    def contains(self, lat: float, lng: float) -> bool:
        return self.min_lat <= lat <= self.max_lat and self.min_lng <= lng <= self.max_lng


@dataclass(frozen=True)
class Region:
    name: str
    label: str
    bounds: GeoBounds
    cafenomad_city: str | None = None


REGIONS: dict[str, Region] = {
    "greater_taipei": Region(
        name="greater_taipei",
        label="Greater Taipei (大台北)",
        bounds=GeoBounds(
            min_lat=24.93,
            max_lat=25.30,
            min_lng=121.37,
            max_lng=121.70,
        ),
        cafenomad_city="taipei",
    ),
}

DEFAULT_REGION = "greater_taipei"
