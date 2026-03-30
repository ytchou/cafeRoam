"""Tests for validate_supabase.py — mock cursor at DB boundary."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from validate_supabase import CheckResult, check_schema_parity


class MockCursor:
    """Minimal cursor mock that returns pre-set results."""

    def __init__(self, results: list):
        self._results = iter(results)

    def execute(self, query, params=None):
        self._current = next(self._results)

    def fetchone(self):
        return self._current

    def fetchall(self):
        return self._current


def test_schema_parity_passes_when_migration_count_matches():
    """Given a database with 78+ migrations, the schema parity check passes."""
    cursor = MockCursor(results=[
        (78,),  # migration count
        [       # expected tables all exist
            ("shops",), ("check_ins",), ("lists",), ("list_items",),
            ("profiles",), ("stamps",), ("shop_photos",),
            ("shop_reviews",), ("taxonomy_tags",), ("shop_tags",),
            ("job_queue",), ("search_events",), ("shop_followers",),
            ("shop_claims",), ("shop_submissions",), ("activity_feed",),
            ("shop_menu_items",), ("community_note_likes",),
            ("user_roles",), ("search_cache",), ("shop_content",),
            ("shop_owner_tags",), ("review_responses",),
            ("admin_audit_logs",),
        ],
    ])
    results = check_schema_parity(cursor)
    assert len(results) == 2
    assert results[0].passed  # migration count
    assert results[1].passed  # tables exist


def test_schema_parity_fails_when_migration_count_low():
    """Given a database with fewer than 78 migrations, the check fails."""
    cursor = MockCursor(results=[
        (50,),  # only 50 migrations
        [],     # tables query (won't matter)
    ])
    results = check_schema_parity(cursor)
    assert not results[0].passed
    assert "50" in results[0].details
