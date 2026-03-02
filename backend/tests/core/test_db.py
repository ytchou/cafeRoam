import pytest

from core.db import first


def test_first_returns_first_element():
    assert first([42, 99, 7], "test") == 42


def test_first_works_with_single_element():
    assert first(["only"], "test") == "only"


def test_first_works_with_dicts():
    rows = [{"id": "abc"}, {"id": "def"}]
    assert first(rows, "fetch row")["id"] == "abc"


def test_first_raises_on_empty_list():
    with pytest.raises(RuntimeError, match="Expected at least one row from create list, got 0"):
        first([], "create list")


def test_first_default_context_in_error():
    with pytest.raises(RuntimeError, match="query"):
        first([])
