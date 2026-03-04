def escape_ilike(search: str) -> str:
    """Escape special characters for a PostgreSQL ILIKE pattern."""
    return search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def first[T](rows: list[T], context: str = "query") -> T:
    """Return the first element of a non-empty list.

    Raises RuntimeError with a descriptive message if the list is empty,
    rather than the opaque IndexError you'd get from rows[0].

    Args:
        rows: The list to take the first element from.
        context: A short label describing the operation (used in the error message).
    """
    if not rows:
        raise RuntimeError(f"Expected at least one row from {context}, got 0")
    return rows[0]
