#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = ["psycopg2-binary"]
# ///
"""Environment data sync tooling for CafeRoam.

Subcommands:
    audit     — Audit a remote DB for data quality (row counts, fields, embeddings)
    snapshot  — pg_dump sync-scope tables to a dated SQL file
    promote   — Snapshot staging → validate → restore to prod
    restore   — Restore a snapshot SQL file to a target DB

Usage:
    DATABASE_URL=postgresql://... uv run scripts/sync_data.py audit
    DATABASE_URL=postgresql://... uv run scripts/sync_data.py snapshot --env staging
    STAGING_DATABASE_URL=... PROD_DATABASE_URL=... uv run scripts/sync_data.py promote
    uv run scripts/sync_data.py restore --file supabase/snapshots/latest.sql [--target-url ...]
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    import psycopg2
except ImportError:
    psycopg2 = None  # type: ignore[assignment]

# -- Constants -----------------------------------------------------------------

SYNC_TABLES = {
    "shops",
    "shop_photos",
    "shop_reviews",
    "shop_tags",
    "taxonomy_tags",
    "shop_menu_items",
    "shop_content",
}

SNAPSHOTS_DIR = Path(__file__).resolve().parent.parent / "supabase" / "snapshots"

EMBEDDING_COVERAGE_THRESHOLD = 0.80


# -- Result model --------------------------------------------------------------


@dataclass
class AuditResult:
    category: str
    name: str
    passed: bool
    details: str


# -- Audit checks --------------------------------------------------------------


def check_row_counts(cursor) -> list[AuditResult]:
    """Check that all sync-scope tables have at least one row."""
    cursor.execute(
        "SELECT table_name, "
        "(xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count "
        "FROM ("
        "  SELECT table_name, "
        "  query_to_xml('SELECT COUNT(*) AS cnt FROM public.' || table_name, false, true, '') AS xml_count "
        "  FROM information_schema.tables "
        "  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
        "  AND table_name = ANY(%s)"
        ") sub ORDER BY table_name",
        (sorted(SYNC_TABLES),),
    )
    rows = cursor.fetchall()
    results = []
    found_tables = {row[0] for row in rows}

    for table in sorted(SYNC_TABLES):
        if table not in found_tables:
            results.append(
                AuditResult(
                    category="Row Counts",
                    name=f"{table}",
                    passed=False,
                    details="Table not found in database",
                )
            )
        else:
            count = next(row[1] for row in rows if row[0] == table)
            results.append(
                AuditResult(
                    category="Row Counts",
                    name=f"{table}",
                    passed=count > 0,
                    details=f"{count} rows" if count > 0 else "0 rows — table is empty",
                )
            )

    return results


def check_required_fields(cursor) -> list[AuditResult]:
    """Check that all shops have name, lat, lng."""
    results = []
    for field in ("name", "lat", "lng"):
        cursor.execute(f"SELECT COUNT(*) FROM public.shops WHERE {field} IS NULL")
        count = cursor.fetchone()[0]
        results.append(
            AuditResult(
                category="Required Fields",
                name=f"shops.{field} not null",
                passed=count == 0,
                details=f"All shops have {field}"
                if count == 0
                else f"{count} shops missing {field}",
            )
        )
    return results


def check_embedding_coverage(cursor) -> list[AuditResult]:
    """Check that >80% of shops have non-null embeddings."""
    cursor.execute("SELECT COUNT(*) FROM public.shops")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM public.shops WHERE embedding IS NOT NULL")
    with_embedding = cursor.fetchone()[0]

    if total == 0:
        return [
            AuditResult(
                category="Embeddings",
                name="Embedding coverage",
                passed=False,
                details="No shops in database",
            )
        ]

    pct = with_embedding / total
    threshold_pct = int(EMBEDDING_COVERAGE_THRESHOLD * 100)
    return [
        AuditResult(
            category="Embeddings",
            name="Embedding coverage",
            passed=pct >= EMBEDDING_COVERAGE_THRESHOLD,
            details=f"{with_embedding}/{total} ({pct:.0%}) shops have embeddings "
            f"(threshold: {threshold_pct}%)",
        )
    ]


def check_taxonomy_integrity(cursor) -> list[AuditResult]:
    """Check that all shop_tags.tag_id reference valid taxonomy_tags.id."""
    cursor.execute(
        "SELECT COUNT(*) FROM public.shop_tags st "
        "LEFT JOIN public.taxonomy_tags tt ON st.tag_id = tt.id "
        "WHERE tt.id IS NULL"
    )
    orphaned = cursor.fetchone()[0]
    return [
        AuditResult(
            category="Referential Integrity",
            name="shop_tags → taxonomy_tags",
            passed=orphaned == 0,
            details="All tag references valid"
            if orphaned == 0
            else f"{orphaned} shop_tags reference non-existent taxonomy_tags",
        )
    ]


def check_orphaned_photos(cursor) -> list[AuditResult]:
    """Check that all shop_photos.shop_id exist in shops."""
    cursor.execute(
        "SELECT COUNT(*) FROM public.shop_photos sp "
        "LEFT JOIN public.shops s ON sp.shop_id = s.id "
        "WHERE s.id IS NULL"
    )
    orphaned = cursor.fetchone()[0]
    return [
        AuditResult(
            category="Referential Integrity",
            name="shop_photos → shops",
            passed=orphaned == 0,
            details="All photo references valid"
            if orphaned == 0
            else f"{orphaned} shop_photos reference non-existent shops",
        )
    ]


def run_audit(cursor) -> list[AuditResult]:
    """Run all audit checks and return results."""
    results = []
    results.extend(check_row_counts(cursor))
    results.extend(check_required_fields(cursor))
    results.extend(check_embedding_coverage(cursor))
    results.extend(check_taxonomy_integrity(cursor))
    results.extend(check_orphaned_photos(cursor))
    return results


def print_audit_report(results: list[AuditResult]) -> bool:
    """Print structured audit report. Returns True if all passed."""
    current_category = None
    all_passed = True

    print("\n" + "=" * 60)
    print("  CafeRoam Data Audit Report")
    print("=" * 60)

    for r in results:
        if r.category != current_category:
            current_category = r.category
            print(f"\n  [{current_category}]")

        status = "PASS" if r.passed else "FAIL"
        marker = "+" if r.passed else "!"
        print(f"    {marker} {status}: {r.name}")
        print(f"           {r.details}")
        if not r.passed:
            all_passed = False

    print("\n" + "-" * 60)
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed
    print(f"  Total: {total}  |  Passed: {passed}  |  Failed: {failed}")
    print("=" * 60 + "\n")

    return all_passed


# -- Snapshot ------------------------------------------------------------------


def cmd_snapshot(database_url: str, env_name: str) -> Path:
    """pg_dump sync-scope tables to a dated snapshot file."""
    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{date_str}-{env_name}.sql"
    filepath = SNAPSHOTS_DIR / filename

    # Build pg_dump command with table filters
    table_args = []
    for table in sorted(SYNC_TABLES):
        table_args.extend(["-t", f"public.{table}"])

    cmd = [
        "pg_dump",
        database_url,
        "--data-only",
        "--no-owner",
        "--no-privileges",
        "--disable-triggers",
        *table_args,
    ]

    print(f"Snapshotting {env_name} → {filepath}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"pg_dump failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    # Get row counts for the header
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cursor:
            counts = {}
            for table in sorted(SYNC_TABLES):
                cursor.execute(f"SELECT COUNT(*) FROM public.{table}")
                counts[table] = cursor.fetchone()[0]
    finally:
        conn.close()

    # Write file with header
    header = (
        f"-- CafeRoam data snapshot\n"
        f"-- Source: {env_name}\n"
        f"-- Generated: {datetime.now(timezone.utc).isoformat()}\n"
        f"-- Row counts: {', '.join(f'{t}={c}' for t, c in sorted(counts.items()))}\n"
        f"--\n"
        f"-- Restore: uv run scripts/sync_data.py restore --file {filepath.name}\n"
        f"--\n"
        f"SET session_replication_role = replica;\n\n"
    )

    # Build truncate in FK-safe order (children first)
    truncate = (
        "TRUNCATE public.shop_content, public.shop_menu_items, "
        "public.shop_photos, public.shop_reviews, public.shop_tags, "
        "public.taxonomy_tags, public.shops "
        "RESTART IDENTITY CASCADE;\n\n"
    )

    filepath.write_text(header + truncate + result.stdout)

    # Update latest symlink
    latest = SNAPSHOTS_DIR / "latest.sql"
    latest.unlink(missing_ok=True)
    latest.symlink_to(filename)

    print(f"Done — {filepath} ({filepath.stat().st_size / 1024:.0f} KB)")
    for table, count in sorted(counts.items()):
        print(f"  {table}: {count} rows")

    return filepath


# -- Restore -------------------------------------------------------------------


def cmd_restore(filepath: Path, target_url: str) -> None:
    """Restore a snapshot SQL file to a target database."""
    if not filepath.exists():
        print(f"File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    print(f"Restoring {filepath.name} → target database")
    cmd = ["psql", target_url, "-f", str(filepath)]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"psql restore failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    print("Restore complete.")


# -- Promote -------------------------------------------------------------------


def cmd_promote(staging_url: str, prod_url: str) -> None:
    """Promote staging data to prod: snapshot → validate → restore."""
    # 1. Audit staging first
    print("Step 1/3: Auditing staging data...")
    conn = psycopg2.connect(staging_url)
    try:
        with conn.cursor() as cursor:
            results = run_audit(cursor)
    finally:
        conn.close()

    all_passed = print_audit_report(results)
    if not all_passed:
        print(
            "ABORTED: Staging audit failed. Fix issues before promoting.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 2. Snapshot staging
    print("Step 2/3: Snapshotting staging...")
    snapshot_path = cmd_snapshot(staging_url, "staging")

    # 3. Restore to prod
    print("Step 3/3: Restoring to prod...")
    cmd_restore(snapshot_path, prod_url)

    print("\nPromotion complete: staging → prod")


# -- CLI entry point -----------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="CafeRoam environment data sync tooling",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # audit
    p_audit = sub.add_parser("audit", help="Audit remote DB data quality")
    p_audit.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Direct Postgres connection URL. Default: $DATABASE_URL",
    )

    # snapshot
    p_snap = sub.add_parser("snapshot", help="Snapshot sync-scope tables to SQL file")
    p_snap.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Direct Postgres connection URL. Default: $DATABASE_URL",
    )
    p_snap.add_argument("--env", required=True, help="Environment name (staging, prod)")

    # promote
    sub.add_parser(
        "promote", help="Promote staging → prod (snapshot + validate + restore)"
    )

    # restore
    p_restore = sub.add_parser("restore", help="Restore a snapshot to a target DB")
    p_restore.add_argument(
        "--file", required=True, type=Path, help="Snapshot SQL file path"
    )
    p_restore.add_argument(
        "--target-url",
        default=os.environ.get(
            "DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        ),
        help="Target DB URL. Default: local Supabase",
    )

    args = parser.parse_args()

    if args.command == "audit":
        url = args.database_url
        if not url:
            print("Error: DATABASE_URL not set.", file=sys.stderr)
            sys.exit(1)
        conn = psycopg2.connect(url)
        try:
            with conn.cursor() as cursor:
                results = run_audit(cursor)
        finally:
            conn.close()
        all_passed = print_audit_report(results)
        sys.exit(0 if all_passed else 1)

    elif args.command == "snapshot":
        url = args.database_url
        if not url:
            print("Error: DATABASE_URL not set.", file=sys.stderr)
            sys.exit(1)
        cmd_snapshot(url, args.env)

    elif args.command == "promote":
        staging_url = os.environ.get("STAGING_DATABASE_URL")
        prod_url = os.environ.get("PROD_DATABASE_URL")
        if not staging_url or not prod_url:
            print(
                "Error: Both STAGING_DATABASE_URL and PROD_DATABASE_URL must be set.",
                file=sys.stderr,
            )
            sys.exit(1)
        cmd_promote(staging_url, prod_url)

    elif args.command == "restore":
        filepath = args.file
        # Resolve relative to snapshots dir if not absolute
        if not filepath.is_absolute() and not filepath.exists():
            filepath = SNAPSHOTS_DIR / filepath.name
        cmd_restore(filepath, args.target_url)


if __name__ == "__main__":
    main()
