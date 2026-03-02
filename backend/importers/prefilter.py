"""Pre-filter pipeline for shop imports.

Runs cheap, synchronous checks before shops enter the pipeline.
Steps 1-4,6 run during import; step 5 (HTTP HEAD) runs as a background batch.
"""

import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any

import structlog

from models.types import ProcessingStatus

logger = structlog.get_logger()

# Google Maps URL patterns
_GOOGLE_MAPS_PATTERNS = re.compile(
    r"^https?://(www\.)?"
    r"(maps\.google\.(com|tw)|google\.(com|tw)/maps|goo\.gl/maps|maps\.app\.goo\.gl)"
    r"(/|$|\?|#)",
    re.IGNORECASE,
)

# Coordinate delta for ~200m proximity check
_COORD_DELTA_200M = 0.0018  # ~200m in degrees at Taiwan latitude

# Name similarity threshold for fuzzy dedup
_FUZZY_THRESHOLD = 0.8


@dataclass
class FilterResult:
    passed: bool
    reason: str | None = None


def validate_google_maps_url(url: str) -> FilterResult:
    """Step 1: Check URL is a recognisable Google Maps URL."""
    if not url or not url.strip():
        return FilterResult(passed=False, reason="invalid_url")
    if not _GOOGLE_MAPS_PATTERNS.match(url.strip()):
        return FilterResult(passed=False, reason="invalid_url")
    return FilterResult(passed=True)


def validate_shop_name(name: str) -> FilterResult:
    """Step 4: Reject names with invalid encoding, control chars, or non-informative content."""
    if not name or not name.strip():
        return FilterResult(passed=False, reason="invalid_name")

    stripped = name.strip()

    # Reject non-printable / control characters but allow Cf (format chars) —
    # Unicode format chars (Cf) appear in valid CJK shop names from Google Maps.
    for ch in stripped:
        category = unicodedata.category(ch)
        if category in ("Cc", "Cs", "Co", "Cn"):  # control, surrogate, private-use, unassigned
            return FilterResult(passed=False, reason="invalid_name")

    # Reject pure ASCII numbers/symbols with no letters
    has_letter = any(ch.isalpha() for ch in stripped)
    if not has_letter:
        return FilterResult(passed=False, reason="invalid_name")

    # Reject suspiciously short names (single char)
    if len(stripped) < 2:
        return FilterResult(passed=False, reason="invalid_name")

    return FilterResult(passed=True)


def fuzzy_name_similarity(name_a: str, name_b: str) -> float:
    """Return similarity ratio [0, 1] between two shop names."""
    return SequenceMatcher(None, name_a.lower().strip(), name_b.lower().strip()).ratio()


def is_fuzzy_duplicate(
    name: str,
    lat: float,
    lng: float,
    existing_shops: list[dict[str, Any]],
) -> bool:
    """Step 2: Check if a shop is a near-duplicate of any existing shop.

    Returns True if name similarity > 0.8 AND coordinates are within ~200m.
    existing_shops should be pre-filtered to a geographic bounding box.
    """
    for shop in existing_shops:
        shop_lat = float(shop.get("latitude", 0))
        shop_lng = float(shop.get("longitude", 0))

        # Coordinate proximity: within ~200m
        if abs(shop_lat - lat) > _COORD_DELTA_200M or abs(shop_lng - lng) > _COORD_DELTA_200M:
            continue

        # Name similarity
        similarity = fuzzy_name_similarity(name, shop.get("name", ""))
        if similarity >= _FUZZY_THRESHOLD:
            logger.debug(
                "Fuzzy duplicate detected",
                name=name,
                existing_name=shop.get("name"),
                similarity=similarity,
            )
            return True

    return False


def check_known_failed(db: Any, lat: float, lng: float) -> bool:
    """Step 3: Check if a shop at these coordinates has a known-failed record.

    Returns True if a failed shop exists within ~200m.
    Single-shop version — use is_known_failed_location() with pre-fetched data in loops.
    """
    result = (
        db.table("shops")
        .select("id")
        .eq("processing_status", ProcessingStatus.FAILED.value)
        .gte("latitude", lat - _COORD_DELTA_200M)
        .lte("latitude", lat + _COORD_DELTA_200M)
        .gte("longitude", lng - _COORD_DELTA_200M)
        .lte("longitude", lng + _COORD_DELTA_200M)
        .execute()
    )
    return bool(result.data)


def is_known_failed_location(
    lat: float,
    lng: float,
    failed_shops: list[dict[str, Any]],
) -> bool:
    """Step 3 (bulk): Check against pre-fetched failed shops list.

    Use this in import loops to avoid N+1 queries.
    failed_shops should be pre-fetched once with fetch_failed_shops().
    """
    for shop in failed_shops:
        shop_lat = float(shop.get("latitude", 0))
        shop_lng = float(shop.get("longitude", 0))
        if abs(shop_lat - lat) <= _COORD_DELTA_200M and abs(shop_lng - lng) <= _COORD_DELTA_200M:
            return True
    return False


@dataclass
class PreFilterSummary:
    invalid_url: int = 0
    invalid_name: int = 0
    known_failed: int = 0
    closed: int = 0
    flagged_duplicates: int = 0

    def total_rejected(self) -> int:
        return self.invalid_url + self.invalid_name + self.known_failed + self.closed
