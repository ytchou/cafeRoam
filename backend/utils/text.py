"""Text utilities for shop data normalization."""

import re

# SEO noise patterns that should be stripped from shop names
_SEO_NOISE_PATTERNS = [
    r"\(完整菜單[^)]*\)",  # 完整菜單可點instagram, etc.
    r"\(菜單[^)]*\)",  # 菜單/menu/IG, etc.
    r"\(wifi[^)]*\)",  # wifi/插座/不限時, etc.
    r"\(menu[^)]*\)",  # menu links
    r"\(IG[^)]*\)",  # IG links
    r"\(instagram[^)]*\)",  # instagram links
    r"\([^)]*(?:/)[^)]*\)",  # anything with / inside (wifi/插座, 菜單/menu, etc.)
]


def normalize_shop_name(name: str) -> str:
    """
    Normalize a shop name by stripping SEO noise from Google Maps.

    Strips trailing parenthetical content that looks like SEO keywords
    (e.g., "(完整菜單可點instagram)", "(wifi/插座/不限時)") while
    preserving valid branch names (e.g., "(中山店)", "(Zhongshan)").

    Args:
        name: Raw shop name from Google Maps.

    Returns:
        Normalized shop name.
    """
    if not name:
        return ""

    result = name.strip()

    # Strip known SEO noise patterns
    for pattern in _SEO_NOISE_PATTERNS:
        result = re.sub(pattern, "", result, flags=re.IGNORECASE)

    return result.strip()
