# Catch base exception class, not an enumerated subclass list

**Date:** 2026-03-20
**Context:** directions-provider — MapboxMapsAdapter caught specific httpx subclasses individually

**What happened:** The adapter caught `(httpx.HTTPStatusError, httpx.TimeoutException, httpx.ConnectError, KeyError)` but not the `httpx.RequestError` base class. Subclasses like `ReadError`, `RemoteProtocolError`, and `WriteError` propagated as uncontrolled 500s instead of the intended 502.

**Root cause:** Listing known subclasses creates a fragile allowlist. New subclasses added by the library in future versions (or edge cases like `RemoteProtocolError`) silently escape.

**Prevention:** When catching transport/network errors from an HTTP library, catch the base class (`httpx.RequestError`), not individual subclasses — unless you specifically need different handling per subclass. Check the library's exception hierarchy before writing the except clause.
