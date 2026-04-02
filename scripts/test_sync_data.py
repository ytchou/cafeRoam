"""Tests for sync_data.py audit checks — mock cursor at DB boundary."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

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
    cursor = MockCursor(results=[
        [(t, 100) for t in sorted(SYNC_TABLES)],
    ])
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


# -- Required fields -----------------------------------------------------------

def test_required_fields_pass_when_all_present():
    """Given all shops have name, lat, lng, required fields check passes."""
    cursor = MockCursor(results=[
        (0,),  # count of shops missing name
        (0,),  # count of shops missing lat
        (0,),  # count of shops missing lng
    ])
    results = check_required_fields(cursor)
    assert all(r.passed for r in results)


def test_required_fields_fail_when_name_missing():
    """Given some shops missing name, required fields check fails."""
    cursor = MockCursor(results=[
        (5,),  # 5 shops missing name
        (0,),  # lat ok
        (0,),  # lng ok
    ])
    results = check_required_fields(cursor)
    failed = [r for r in results if not r.passed]
    assert len(failed) >= 1
    assert any("name" in r.details for r in failed)


# -- Embedding coverage --------------------------------------------------------

def test_embedding_coverage_passes_above_threshold():
    """Given >80% of shops have embeddings, check passes."""
    cursor = MockCursor(results=[
        (100,),  # total shops
        (85,),   # shops with embeddings
    ])
    results = check_embedding_coverage(cursor)
    assert all(r.passed for r in results)


def test_embedding_coverage_fails_below_threshold():
    """Given <80% of shops have embeddings, check fails."""
    cursor = MockCursor(results=[
        (100,),  # total shops
        (50,),   # only 50% with embeddings
    ])
    results = check_embedding_coverage(cursor)
    assert not results[0].passed
    assert "50" in results[0].details


# -- Taxonomy integrity --------------------------------------------------------

def test_taxonomy_integrity_passes_when_all_refs_valid():
    """Given all shop_tags reference valid taxonomy_tags, check passes."""
    cursor = MockCursor(results=[
        (0,),  # 0 orphaned tag references
    ])
    results = check_taxonomy_integrity(cursor)
    assert all(r.passed for r in results)


def test_taxonomy_integrity_fails_when_orphaned_refs():
    """Given shop_tags reference non-existent taxonomy_tags, check fails."""
    cursor = MockCursor(results=[
        (12,),  # 12 orphaned references
    ])
    results = check_taxonomy_integrity(cursor)
    assert not results[0].passed


# -- Orphaned photos -----------------------------------------------------------

def test_orphaned_photos_passes_when_none():
    """Given all shop_photos reference existing shops, check passes."""
    cursor = MockCursor(results=[
        (0,),  # 0 orphaned photos
    ])
    results = check_orphaned_photos(cursor)
    assert all(r.passed for r in results)


def test_orphaned_photos_fails_when_orphans_exist():
    """Given shop_photos reference non-existent shops, check fails."""
    cursor = MockCursor(results=[
        (8,),  # 8 orphaned photos
    ])
    results = check_orphaned_photos(cursor)
    assert not results[0].passed
