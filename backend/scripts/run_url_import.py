"""Import one or more Google Maps URLs directly into the shop pipeline.

Usage (run from backend/):
    uv run python scripts/run_url_import.py "https://www.google.com/maps/place/..."
    uv run python scripts/run_url_import.py "URL1" "URL2" "URL3"
    uv run python scripts/run_url_import.py "https://goo.gl/maps/..." --name "Shop Name"

Shop names are extracted automatically from long-form Google Maps URLs.
For short URLs (goo.gl, maps.app.goo.gl), provide --name explicitly.

Shops are inserted as pending_url_check. The background URL checker
then transitions them to pending_review for admin approval.
"""

import re
import sys
import urllib.parse

import structlog

from db.supabase_client import get_service_role_client
from importers.prefilter import validate_google_maps_url, validate_shop_name

logger = structlog.get_logger()

_SHORT_URL_HOSTS = {"goo.gl", "maps.app.goo.gl"}

_PLACE_NAME_RE = re.compile(r"/maps/place/([^/@?#]+)")


def extract_name_from_url(url: str) -> str | None:
    """Extract a human-readable shop name from a long-form Google Maps URL.

    Returns None for short URLs or place-ID-only URLs (ChIJ...).
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc in _SHORT_URL_HOSTS:
        return None

    match = _PLACE_NAME_RE.search(parsed.path)
    if not match:
        return None

    raw = match.group(1)
    name = urllib.parse.unquote_plus(raw).strip()

    # Skip bare place IDs — they look like "ChIJxxxxxx"
    if re.match(r"^ChIJ", name):
        return None

    return name if len(name) >= 2 else None


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("Usage: uv run python scripts/run_url_import.py <URL> [URL ...] [--name NAME]")
        sys.exit(1)

    # Parse optional --name flag
    explicit_name: str | None = None
    if "--name" in args:
        idx = args.index("--name")
        if idx + 1 >= len(args):
            print("Error: --name requires a value")
            sys.exit(1)
        explicit_name = args[idx + 1]
        args = args[:idx] + args[idx + 2 :]

    if not args:
        print("Error: no URLs provided")
        sys.exit(1)

    if explicit_name and len(args) > 1:
        print("Error: --name can only be used with a single URL")
        sys.exit(1)

    db = get_service_role_client()

    queued = 0
    skipped = 0

    for url in args:
        url = url.strip()

        # Validate URL format
        url_result = validate_google_maps_url(url)
        if not url_result.passed:
            print(f"  Skip (invalid URL): {url}")
            skipped += 1
            continue

        # Resolve name
        name = explicit_name or extract_name_from_url(url)
        if not name:
            print(
                f"  Skip (cannot extract name from short URL — use --name): {url}"
            )
            skipped += 1
            continue

        # Validate name
        name_result = validate_shop_name(name)
        if not name_result.passed:
            print(f"  Skip (invalid name '{name}'): {url}")
            skipped += 1
            continue

        # Check for duplicate URL
        existing = (
            db.table("shops").select("id").eq("google_maps_url", url).execute()
        )
        if existing.data:
            print(f"  Skip (already exists): {name}")
            skipped += 1
            continue

        try:
            db.table("shops").insert(
                {
                    "name": name,
                    "address": "",
                    "review_count": 0,
                    "processing_status": "pending_url_check",
                    "source": "manual_url",
                    "google_maps_url": url,
                }
            ).execute()
            print(f"  Queued: {name}")
            queued += 1
        except Exception as e:
            print(f"  Error inserting '{name}': {e}")
            skipped += 1

    print(f"\nDone: {queued} queued, {skipped} skipped.")
    if queued:
        print("Next: start the backend so the URL checker can run.")
        print("  cd backend && uvicorn main:app --reload --port 8000")
        print("  Monitor: GET http://localhost:8000/admin/pipeline/overview")


if __name__ == "__main__":
    main()
