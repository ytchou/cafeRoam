"""Shared rate limiter instance for API endpoints."""

import jwt as pyjwt
from slowapi import Limiter
from slowapi.util import get_ipaddr
from starlette.requests import Request

from core.config import settings


def get_user_id_or_ip(request: Request) -> str:
    """Extract user ID from JWT for per-user limiting, fall back to IP.

    Uses unverified decode — rate limiting only needs a stable key.
    Auth verification happens later in the dependency chain.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = pyjwt.decode(
                auth[7:],
                options={"verify_signature": False},
                algorithms=["HS256", "RS256", "ES256"],
            )
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except pyjwt.exceptions.DecodeError:
            pass
    return get_ipaddr(request)


limiter = Limiter(
    key_func=get_ipaddr,
    default_limits=[settings.rate_limit_default],
)
