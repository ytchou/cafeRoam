"""Tests for sync_data.py audit checks — mock cursor at DB boundary."""

import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(__file__))

import sync_data
from sync_data import (
    AuditResult,
    check_row_counts,
    check_required_fields,
    check_embedding_coverage,
    check_taxonomy_integrity,
    check_orphaned_photos,
    SYNC_TABLES,
)


class MockCursor:
    """Minimal cursor mock that returns pre-set results."""

    def __init__(self, results: list):
        self._results = iter(results)
        self._call_count = 0

    def execute(self, query, params=None):
        self._call_count += 1
        try:
            self._current = next(self._results)
        except StopIteration:
            raise AssertionError(
                f"MockCursor exhausted on call #{self._call_count}: "
                f"execute() called more times than results provided. "
                f"Query: {query[:80]!r}"
            )

    def fetchone(self):
        return self._current

    def fetchall(self):
        return self._current


# -- Row count checks ----------------------------------------------------------


def test_row_counts_pass_when_all_tables_populated():
    """Given all sync-scope tables have rows, row count check passes."""
    cursor = MockCursor(
        results=[
            [(t, 100) for t in sorted(SYNC_TABLES)],
        ]
    )
    results = check_row_counts(cursor)
    assert all(r.passed for r in results)


def test_row_counts_fail_when_table_empty():
    """Given a sync-scope table has 0 rows, row count check fails."""
    counts = [(t, 0 if t == "shops" else 100) for t in sorted(SYNC_TABLES)]
    cursor = MockCursor(results=[counts])
    results = check_row_counts(cursor)
    failed = [r for r in results if not r.passed]
    assert len(failed) >= 1
    assert any("shops" in r.name for r in failed)


def test_row_counts_fail_when_table_missing_from_db():
    """Given a sync-scope table is absent from the DB entirely, row count check fails for that table."""
    # Return all tables except "shops" to simulate a missing table
    counts = [(t, 50) for t in sorted(SYNC_TABLES) if t != "shops"]
    cursor = MockCursor(results=[counts])
    results = check_row_counts(cursor)
    failed = [r for r in results if not r.passed]
    assert any("shops" in r.name for r in failed)
    assert any("not found in database" in r.details for r in failed)


# -- Required fields -----------------------------------------------------------


def test_required_fields_pass_when_all_present():
    """Given all shops have name, latitude, longitude, required fields check passes."""
    cursor = MockCursor(
        results=[
            (0,),  # count of shops missing name
            (0,),  # count of shops missing latitude
            (0,),  # count of shops missing longitude
        ]
    )
    results = check_required_fields(cursor)
    assert all(r.passed for r in results)


def test_required_fields_fail_when_name_missing():
    """Given some shops missing name, required fields check fails."""
    cursor = MockCursor(
        results=[
            (5,),  # 5 shops missing name
            (0,),  # latitude ok
            (0,),  # longitude ok
        ]
    )
    results = check_required_fields(cursor)
    failed = [r for r in results if not r.passed]
    assert len(failed) >= 1
    assert any("name" in r.details for r in failed)


# -- Embedding coverage --------------------------------------------------------


def test_embedding_coverage_passes_above_threshold():
    """Given >80% of shops have embeddings, check passes."""
    cursor = MockCursor(
        results=[
            (100,),  # total shops
            (85,),  # shops with embeddings
        ]
    )
    results = check_embedding_coverage(cursor)
    assert all(r.passed for r in results)


def test_embedding_coverage_fails_below_threshold():
    """Given <80% of shops have embeddings, check fails."""
    cursor = MockCursor(
        results=[
            (100,),  # total shops
            (50,),  # only 50% with embeddings
        ]
    )
    results = check_embedding_coverage(cursor)
    assert not results[0].passed
    assert "50" in results[0].details


def test_embedding_coverage_passes_at_exactly_threshold():
    """Given exactly 80% of shops have embeddings, check passes (threshold is inclusive)."""
    cursor = MockCursor(results=[(100,), (80,)])
    results = check_embedding_coverage(cursor)
    assert results[0].passed


def test_embedding_coverage_fails_just_below_threshold():
    """Given 79% of shops have embeddings, check fails (one below threshold)."""
    cursor = MockCursor(results=[(100,), (79,)])
    results = check_embedding_coverage(cursor)
    assert not results[0].passed


# -- Taxonomy integrity --------------------------------------------------------


def test_taxonomy_integrity_passes_when_all_refs_valid():
    """Given all shop_tags reference valid taxonomy_tags, check passes."""
    cursor = MockCursor(
        results=[
            (0,),  # 0 orphaned tag references
        ]
    )
    results = check_taxonomy_integrity(cursor)
    assert all(r.passed for r in results)


def test_taxonomy_integrity_fails_when_orphaned_refs():
    """Given shop_tags reference non-existent taxonomy_tags, check fails."""
    cursor = MockCursor(
        results=[
            (12,),  # 12 orphaned references
        ]
    )
    results = check_taxonomy_integrity(cursor)
    assert not results[0].passed


# -- Orphaned photos -----------------------------------------------------------


def test_orphaned_photos_passes_when_none():
    """Given all shop_photos reference existing shops, check passes."""
    cursor = MockCursor(
        results=[
            (0,),  # 0 orphaned photos
        ]
    )
    results = check_orphaned_photos(cursor)
    assert all(r.passed for r in results)


def test_orphaned_photos_fails_when_orphans_exist():
    """Given shop_photos reference non-existent shops, check fails."""
    cursor = MockCursor(
        results=[
            (8,),  # 8 orphaned photos
        ]
    )
    results = check_orphaned_photos(cursor)
    assert not results[0].passed


# -- Snapshot integration -------------------------------------------------------


@pytest.mark.integration
def test_snapshot_creates_dated_file(tmp_path, monkeypatch):
    """Given a valid DATABASE_URL, snapshot creates a dated SQL file with header."""
    db_url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

    # Check if local Supabase is available
    try:
        import psycopg2

        conn = psycopg2.connect(db_url)
        conn.close()
    except Exception:
        pytest.skip("Local Supabase not available")

    from sync_data import cmd_snapshot

    snapshots_dir = tmp_path / "snapshots"
    snapshots_dir.mkdir()
    monkeypatch.setattr(sync_data, "SNAPSHOTS_DIR", snapshots_dir)

    filepath = cmd_snapshot(db_url, "test")
    assert filepath.exists()
    content = filepath.read_text()
    assert "CafeRoam data snapshot" in content
    assert "Source: test" in content
    assert "SET session_replication_role = replica" in content
    assert "TRUNCATE" in content

    # Check latest symlink
    latest = snapshots_dir / "latest.sql"
    assert latest.is_symlink()


# -- Promote gate --------------------------------------------------------------


def test_promote_aborts_when_audit_fails(monkeypatch):
    """Given staging audit reports a failing check, promote exits with code 1 before touching prod."""
    # Cursor results for run_audit when shops table is empty:
    # check_row_counts: 1 fetchall — shops has 0 rows
    # check_required_fields: 3 fetchone — 0 missing each field
    # check_embedding_coverage: 2 fetchone — 0 total, 0 with embedding
    # check_taxonomy_integrity: 1 fetchone — 0 orphaned
    # check_orphaned_photos: 1 fetchone — 0 orphaned
    failing_counts = [(t, 0 if t == "shops" else 47) for t in sorted(SYNC_TABLES)]
    cursor = MockCursor(
        results=[
            failing_counts,  # check_row_counts → shops empty → FAIL
            (0,), (0,), (0,),  # check_required_fields → all pass
            (0,), (0,),       # check_embedding_coverage → 0 total
            (0,),             # check_taxonomy_integrity → pass
            (0,),             # check_orphaned_photos → pass
        ]
    )

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    mock_psycopg2 = MagicMock()
    mock_psycopg2.connect.return_value = mock_conn
    monkeypatch.setattr(sync_data, "psycopg2", mock_psycopg2)

    with pytest.raises(SystemExit) as exc_info:
        sync_data.cmd_promote(
            "postgresql://staging-host/caferoam_staging",
            "postgresql://prod-host/caferoam_prod",
        )

    assert exc_info.value.code == 1
    # Verify only staging was connected — prod was never touched
    mock_psycopg2.connect.assert_called_once_with(
        "postgresql://staging-host/caferoam_staging"
    )
