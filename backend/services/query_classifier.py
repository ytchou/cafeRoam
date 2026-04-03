"""Server-side query type classifier for search scoring.

Classifies search queries using vocabulary-driven compiled regex:
- item_specific: food, drink, or brew method queries
- specialty_coffee: coffee origin, roast level, or processing method queries
- generic: everything else (ambience, facilities, location)

Priority: item_specific > specialty_coffee > generic

Two matching strategies are used in sequence for each category:
1. Forward match: vocabulary term found as substring of query (existing)
2. Reverse match: query found as substring of a vocabulary term (partial input)
   Minimum length guard: 2+ CJK characters or 3+ Latin characters to avoid
   single-character noise matches (e.g. "蛋" matching "巴斯克蛋糕").
"""

import re

from core.search_vocabulary import ITEM_TERMS, SPECIALTY_TERMS
from services.query_normalizer import normalize_query

# Compiled at module level per performance standards — zero per-request cost.
# re.escape() prevents terms with special characters from breaking the pattern.
_ITEM_RE = re.compile("|".join(re.escape(t) for t in ITEM_TERMS))
_SPECIALTY_RE = re.compile("|".join(re.escape(t) for t in SPECIALTY_TERMS))

# CJK Unified Ideographs + Extension A + Compatibility Ideographs
_CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")


def _meets_reverse_min_length(query: str) -> bool:
    """Require 2+ CJK characters or 3+ Latin characters for reverse matching."""
    cjk_count = len(_CJK_RE.findall(query))
    if cjk_count > 0:
        return cjk_count >= 2
    return len(query) >= 3


def _reverse_match(query: str, terms: list[str]) -> bool:
    """Return True if query is a substring of any vocabulary term."""
    if not _meets_reverse_min_length(query):
        return False
    return any(query in term for term in terms)


def classify(query: str) -> str:
    """Classify a search query into item_specific, specialty_coffee, or generic.

    Normalizes the query first (NFKC + lowercase), then applies forward regex
    matching (term in query) followed by reverse substring matching (query in
    term) for each category. item_specific takes priority over specialty_coffee.
    """
    normalized = normalize_query(query)
    if _ITEM_RE.search(normalized) or _reverse_match(normalized, ITEM_TERMS):
        return "item_specific"
    if _SPECIALTY_RE.search(normalized) or _reverse_match(normalized, SPECIALTY_TERMS):
        return "specialty_coffee"
    return "generic"
