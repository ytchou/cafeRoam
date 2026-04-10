from typing import Any

import jwt as pyjwt
import structlog
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient
from supabase import Client

from core.config import settings
from db.supabase_client import get_service_role_client, get_user_client
from providers.email import get_email_provider
from services.claims_service import ClaimsService

logger = structlog.get_logger()

# Fetches the public key set once and caches for 5 minutes.
# Works with HS256 (legacy), RS256, or ES256 — determined by the `kid` in the JWT header.
_jwks_client = PyJWKClient(
    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)


def _get_bearer_token(request: Request) -> str:
    """Extract Bearer token from Authorization header. Raises 401 if missing or malformed."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return auth_header.removeprefix("Bearer ")


def get_admin_db() -> Client:
    """Return a service-role Supabase client (bypasses RLS).
    Use only for admin operations that require elevated privileges."""
    return get_service_role_client()


async def get_user_db(token: str = Depends(_get_bearer_token)) -> Client:  # noqa: B008
    """Return an authenticated Supabase client for the current request.

    This client has auth.uid() set in PostgREST, so RLS policies
    automatically enforce row-level ownership.
    """
    return get_user_client(token)


def get_optional_user_db(request: Request) -> Client:
    """Return an authenticated user DB client if Bearer token present, else service-role client."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ")
        return get_user_client(token)
    return get_service_role_client()


def _decode_jwt_claims(token: str) -> tuple[str, dict[str, Any]]:
    """Decode and verify a Supabase JWT, returning (user_id, app_metadata).

    Raises HTTP 401 on any validation failure.
    """
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )
        app_metadata: dict[str, Any] = payload.get("app_metadata") or {}
        return user_id, app_metadata
    except HTTPException:
        raise
    except pyjwt.InvalidTokenError as exc:
        logger.warning("JWT validation failed", error_type=type(exc).__name__, detail=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None
    except Exception as exc:
        logger.warning("JWT validation error", error_type=type(exc).__name__, detail=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None


def get_current_user(token: str = Depends(_get_bearer_token)) -> dict[str, Any]:  # noqa: B008
    """Validate JWT and return the authenticated user. Raises 401 if invalid.

    Verifies the signature via Supabase's JWKS endpoint (cached). Supports
    ES256, RS256, and HS256 — whichever algorithm the Supabase instance uses.
    """
    user_id, app_metadata = _decode_jwt_claims(token)
    # Check deletion status from DB — JWT app_metadata.deletion_requested is
    # unreliable (local Supabase injects False defaults; prod claims can be stale).
    # DB check also blocks mid-session access, not just new logins.
    service_db = get_service_role_client()
    profile = (
        service_db.table("profiles")
        .select("deletion_requested_at")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if isinstance(profile.data, dict) and profile.data.get("deletion_requested_at") is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending deletion",
        )
    return {"id": user_id, "app_metadata": app_metadata}


def get_current_user_allow_pending(token: str = Depends(_get_bearer_token)) -> dict[str, Any]:  # noqa: B008
    """Like get_current_user but allows accounts pending deletion.

    Use only for the cancel-deletion endpoint, which must be reachable precisely
    when the account is in the deletion grace period.
    """
    user_id, app_metadata = _decode_jwt_claims(token)
    return {"id": user_id, "app_metadata": app_metadata}


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:  # noqa: B008
    """Raise 403 if the user is neither in the admin allowlist nor has is_admin in JWT claims."""
    is_admin_claim = user.get("app_metadata", {}).get("is_admin") is True
    if user["id"] not in settings.admin_user_ids and not is_admin_claim:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_shop_owner(
    shop_id: str,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_admin_db),  # noqa: B008
) -> dict[str, Any]:
    """Verify user has an approved claim for this specific shop.

    Checks shop_claims directly — the claim is the canonical authorization
    record. Role-only checks are insufficient as one shop_owner could
    access another shop's dashboard. See ADR: 2026-03-27-owner-dashboard-dual-claim-check.md
    """
    result = (
        db.table("shop_claims")
        .select("id")
        .eq("shop_id", shop_id)
        .eq("user_id", user["id"])
        .eq("status", "approved")
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(
            status_code=403,
            detail="Not the verified owner of this shop",
        )
    return user


def get_claims_service() -> ClaimsService:
    return ClaimsService(db=get_service_role_client(), email=get_email_provider())


def get_optional_user(request: Request) -> dict[str, Any] | None:
    """Same as get_current_user but returns None instead of raising for unauthenticated."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    try:
        user_id, app_metadata = _decode_jwt_claims(auth_header.removeprefix("Bearer "))
        return {"id": user_id, "app_metadata": app_metadata}
    except Exception:
        return None


def get_optional_current_user(request: Request) -> dict[str, Any] | None:
    """Same as get_optional_user but also verifies the account is not pending deletion.
    Returns None instead of raising for unauthenticated or invalid tokens."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    try:
        user_id, app_metadata = _decode_jwt_claims(auth_header.removeprefix("Bearer "))
        service_db = get_service_role_client()
        profile = (
            service_db.table("profiles")
            .select("deletion_requested_at")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if isinstance(profile.data, dict) and profile.data.get("deletion_requested_at") is not None:
            return None
        return {"id": user_id, "app_metadata": app_metadata}
    except Exception:
        return None
