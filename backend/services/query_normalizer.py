"""Query normalization and cache key hashing for semantic search cache."""

import hashlib
import re

_TRAILING_PUNCT = re.compile(r"[?!.]+$")
_MULTI_SPACE = re.compile(r"\s+")


def normalize_query(text: str) -> str:
    text = text.lower().strip()
    text = _MULTI_SPACE.sub(" ", text)
    text = _TRAILING_PUNCT.sub("", text)
    return text


def hash_cache_key(normalized_text: str, mode: str | None) -> str:
    raw = f"{normalized_text}|{mode or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
