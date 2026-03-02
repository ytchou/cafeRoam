from core.regions import DEFAULT_REGION, REGIONS, GeoBounds, Region


def test_greater_taipei_region_exists():
    assert "greater_taipei" in REGIONS


def test_region_has_required_fields():
    region = REGIONS["greater_taipei"]
    assert region.name == "greater_taipei"
    assert region.label
    assert region.cafenomad_city == "taipei"


def test_geo_bounds_contains_taipei_city_hall():
    bounds = REGIONS["greater_taipei"].bounds
    assert bounds.contains(25.0408, 121.5679)  # Taipei City Hall


def test_geo_bounds_rejects_taichung():
    bounds = REGIONS["greater_taipei"].bounds
    assert not bounds.contains(24.1477, 120.6736)  # Taichung


def test_geo_bounds_rejects_nyc():
    bounds = REGIONS["greater_taipei"].bounds
    assert not bounds.contains(40.730, -73.935)


def test_default_region_is_valid():
    assert DEFAULT_REGION in REGIONS


def test_geo_bounds_frozen():
    """GeoBounds is frozen (immutable)."""
    bounds = GeoBounds(min_lat=24.0, max_lat=26.0, min_lng=120.0, max_lng=122.0)
    import pytest

    with pytest.raises((AttributeError, TypeError)):
        bounds.min_lat = 0.0  # type: ignore[misc]


def test_region_frozen():
    """Region is frozen (immutable)."""
    region = Region(
        name="test",
        label="Test",
        bounds=GeoBounds(min_lat=24.0, max_lat=26.0, min_lng=120.0, max_lng=122.0),
    )
    import pytest

    with pytest.raises((AttributeError, TypeError)):
        region.name = "other"  # type: ignore[misc]
