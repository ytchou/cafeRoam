import re
import unicodedata

_CJK_RE = re.compile(
    r"[\u4E00-\u9FFF"  # CJK Unified Ideographs
    r"\u3400-\u4DBF"  # CJK Extension A
    r"\uF900-\uFAFF"  # CJK Compatibility Ideographs
    r"\u3000-\u303F"  # CJK Symbols and Punctuation
    r"\uFF00-\uFFEF]"  # Fullwidth Forms (fullwidth punctuation)
)

ZH_DOMINANT_THRESHOLD = 0.3


def cjk_ratio(text: str) -> float:
    """Return the fraction of non-whitespace characters that are CJK."""
    stripped = re.sub(r"\s+", "", unicodedata.normalize("NFKC", text))
    if not stripped:
        return 0.0
    cjk_count = len(_CJK_RE.findall(stripped))
    return cjk_count / len(stripped)


def is_zh_dominant(text: str, threshold: float = ZH_DOMINANT_THRESHOLD) -> bool:
    """Check if text is predominantly Traditional Chinese.

    A threshold of 0.3 works well because zh-TW text naturally mixes
    CJK characters with ASCII shop names, coffee origins, and numbers.
    Pure zh-TW prose is typically 0.6-0.9; mixed zh/en with shop names
    is 0.3-0.6; English-only is near 0.0.
    """
    return cjk_ratio(text) >= threshold
