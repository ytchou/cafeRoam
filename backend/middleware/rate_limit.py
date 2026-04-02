"""Shared rate limiter instance for API endpoints."""

from slowapi import Limiter
from slowapi.util import get_ipaddr

# get_ipaddr reads X-Forwarded-For first, falling back to request.client.host.
# get_remote_address would return the proxy's IP behind Railway, collapsing all
# users into one bucket.
limiter = Limiter(key_func=get_ipaddr)
