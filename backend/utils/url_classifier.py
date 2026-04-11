from urllib.parse import urlparse

_INSTAGRAM_HOSTS = frozenset({"instagram.com", "www.instagram.com", "instagr.am"})
_FACEBOOK_HOSTS = frozenset(
    {"facebook.com", "fb.com", "m.facebook.com", "www.facebook.com", "fb.me"}
)
_THREADS_HOSTS = frozenset({"threads.net", "www.threads.net"})


def classify_social_url(url: str | None) -> dict[str, str | None]:
    """Classify a URL into its social platform type.

    Returns a dict with keys instagram_url, facebook_url, threads_url.
    At most one key will be non-None. All others will be None.
    """
    result: dict[str, str | None] = {
        "instagram_url": None,
        "facebook_url": None,
        "threads_url": None,
    }
    if not url:
        return result
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return result
    if host in _INSTAGRAM_HOSTS:
        result["instagram_url"] = url
    elif host in _FACEBOOK_HOSTS:
        result["facebook_url"] = url
    elif host in _THREADS_HOSTS:
        result["threads_url"] = url
    return result
