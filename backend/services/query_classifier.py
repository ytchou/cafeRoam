"""Server-side query type classifier for search scoring.

Classifies search queries using vocabulary-driven compiled regex:
- item_specific: food, drink, or brew method queries
- specialty_coffee: coffee origin, roast level, or processing method queries
- generic: everything else (ambience, facilities, location)

Priority: item_specific > specialty_coffee > generic
"""

import re

from core.search_vocabulary import ITEM_TERMS, SPECIALTY_TERMS
from services.query_normalizer import normalize_query

# Compiled at module level per performance standards — zero per-request cost.
# re.escape() prevents terms with special characters from breaking the pattern.
_ITEM_RE = re.compile("|".join(re.escape(t) for t in ITEM_TERMS))
_SPECIALTY_RE = re.compile("|".join(re.escape(t) for t in SPECIALTY_TERMS))


def classify(query: str) -> str:
    """Classify a search query into item_specific, specialty_coffee, or generic.

    Normalizes the query first (NFKC + lowercase), then uses substring matching
    via compiled regex. item_specific takes priority over specialty_coffee.
    """
    normalized = normalize_query(query)
    if _ITEM_RE.search(normalized):
        return "item_specific"
    if _SPECIALTY_RE.search(normalized):
        return "specialty_coffee"
    return "generic"
