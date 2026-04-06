"""Import a Google Maps saved-places CSV into the shop pipeline.

Usage (run from backend/):
    uv run python scripts/run_csv_import.py /path/to/Coffee.csv

Expected CSV columns (Google Maps export format):
    Title, Note, URL, Tags, Comment

Shops are inserted as pending_url_check. The background URL checker
then transitions them to pending_review, after which the daily batch
cron picks them up for scraping and enrichment.
"""

import asyncio
import sys
from pathlib import Path

import structlog

from db.supabase_client import get_service_role_client
from importers.google_takeout import import_takeout_to_queue, parse_takeout_csv

logger = structlog.get_logger()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: uv run python scripts/run_csv_import.py <path/to/file.csv>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Error: file not found: {path}")
        sys.exit(1)

    if path.suffix.lower() != ".csv":
        print(f"Error: expected a .csv file, got '{path.suffix}'")
        sys.exit(1)

    places = parse_takeout_csv(path.read_text(encoding="utf-8"))

    if not places:
        print("No places parsed. Check the file has Title and URL columns.")
        sys.exit(1)

    print(f"Parsed {len(places)} places from {path.name}")

    db = get_service_role_client()
    result = asyncio.run(import_takeout_to_queue(places, db, region_name="csv_import"))

    print("\nImport complete:")
    print(f"  Queued for URL check : {result['imported']}")
    print(f"  Filtered out         : {sum(result['filtered'].values())}")
    print(f"    Invalid URL        : {result['filtered']['invalid_url']}")
    print(f"    Invalid name       : {result['filtered']['invalid_name']}")
    print(f"    Known failed       : {result['filtered']['known_failed']}")
    print(f"  Fuzzy duplicates     : {result['flagged_duplicates']}")
    print("\nNext: start the backend so the URL checker can run.")
    print("  cd backend && uvicorn main:app --reload --port 8000")
    print("  Monitor: GET http://localhost:8000/admin/pipeline/overview")


if __name__ == "__main__":
    main()
