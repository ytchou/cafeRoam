"""One-way user ID anonymization for PDPA-compliant analytics."""

import hashlib


def anonymize_user_id(user_id: str, *, salt: str) -> str:
    """Return a SHA-256 hex digest of salt + user_id. Not reversible."""
    return hashlib.sha256(f"{salt}:{user_id}".encode()).hexdigest()
