from typing import Any

from fastapi import HTTPException, Request, status

from db.supabase_client import get_supabase_client


async def get_current_user(request: Request) -> dict[str, Any]:
    """Extract and validate JWT from Authorization header. Raises 401 if invalid."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.removeprefix("Bearer ")
    try:
        client = get_supabase_client()
        response = client.auth.get_user(token)
        if response is None or response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {"id": response.user.id, "email": response.user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None


async def get_optional_user(request: Request) -> dict[str, Any] | None:
    """Same as get_current_user but returns None instead of raising for unauthenticated."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.removeprefix("Bearer ")
    try:
        client = get_supabase_client()
        response = client.auth.get_user(token)
        if response is None or response.user is None:
            return None
        return {"id": response.user.id, "email": response.user.email}
    except Exception:
        return None
