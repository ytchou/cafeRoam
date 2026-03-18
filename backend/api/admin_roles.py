from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import require_admin
from db.supabase_client import get_service_role_client

router = APIRouter(prefix="/admin/roles", tags=["admin"])

_VALID_ROLES = {"blogger", "paid_user", "partner", "admin"}


class GrantRoleRequest(BaseModel):
    user_id: str
    role: str


@router.post("", status_code=201)
def grant_role(
    body: GrantRoleRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Grant a role to a user."""
    if body.role not in _VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")

    db = get_service_role_client()
    try:
        response = (
            db.table("user_roles")
            .insert(
                {
                    "user_id": body.user_id,
                    "role": body.role,
                    "granted_by": user["id"],
                }
            )
            .execute()
        )
    except Exception as exc:
        if "duplicate" in str(exc).lower() or "unique" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Role already granted") from exc
        raise

    rows = cast("list[dict[str, Any]]", response.data or [])
    return next(iter(rows), {})


@router.delete("/{user_id}/{role}")
def revoke_role(
    user_id: str,
    role: str,
    _admin: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Revoke a role from a user."""
    db = get_service_role_client()
    response = (
        db.table("user_roles").delete().eq("user_id", user_id).eq("role", role).execute()
    )
    deleted = cast("list[dict[str, Any]]", response.data or [])
    if not deleted:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role revoked"}


@router.get("")
def list_roles(
    role: str | None = None,
    _admin: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> list[dict[str, Any]]:
    """List all role grants, optionally filtered by role."""
    db = get_service_role_client()
    query = db.table("user_roles").select("id, user_id, role, granted_at, granted_by").order("granted_at", desc=True)
    if role:
        query = query.eq("role", role)
    response = query.execute()
    return cast("list[dict[str, Any]]", response.data or [])
