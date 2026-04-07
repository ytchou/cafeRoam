"""Filter and deduplicate a shops CSV before seeding.

Usage:
    uv run python scripts/filter_shops_csv.py <input.csv> [--output cleaned.csv]

Input CSV must have at minimum: name, google_maps_url columns (extra columns ignored).
Output CSV contains only: name, google_maps_url columns.
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from importers.prefilter import validate_google_maps_url


def main() -> None:
    parser = argparse.ArgumentParser(description="Filter and deduplicate a shops CSV.")
    parser.add_argument("input", help="Path to input CSV file")
    parser.add_argument(
        "--output", default="cleaned.csv", help="Path to output CSV file (default: cleaned.csv)"
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    total = 0
    valid_rows: list[dict[str, str]] = []
    invalid_url = 0
    seen_urls: set[str] = set()
    duplicates_removed = 0

    with input_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            name = (row.get("name") or "").strip()
            url = (row.get("google_maps_url") or "").strip()

            result = validate_google_maps_url(url)
            if not result.passed:
                invalid_url += 1
                continue

            if url in seen_urls:
                duplicates_removed += 1
                continue

            seen_urls.add(url)
            valid_rows.append({"name": name, "google_maps_url": url})

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "google_maps_url"])
        writer.writeheader()
        writer.writerows(valid_rows)

    print(f"total: {total}")
    print(f"valid: {len(valid_rows)}")
    print(f"invalid_url: {invalid_url}")
    print(f"duplicates_removed: {duplicates_removed}")
    print(f"output: {output_path}")


if __name__ == "__main__":
    main()
