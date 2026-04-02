import asyncio
from datetime import UTC, datetime
from typing import Any, cast

import structlog
from fastapi import HTTPException
from supabase import Client

from core.config import settings
from core.db import first
from models.types import EmailMessage
from providers.email.interface import EmailProvider

logger = structlog.get_logger()


class ClaimsService:
    def __init__(self, db: Client, email: EmailProvider) -> None:
        self._db = db
        self._email = email

    async def submit_claim(
        self,
        user_id: str,
        shop_id: str,
        contact_name: str,
        contact_email: str,
        role: str,
        proof_photo_path: str,
    ) -> dict[str, Any]:
        """Insert a shop claim. Raises 404 if shop not found, 409 if already has active claim."""
        shop_resp = await asyncio.to_thread(
            lambda: self._db.table("shops").select("name").eq("id", shop_id).limit(1).execute()
        )
        if not shop_resp.data:
            raise HTTPException(status_code=404, detail="Shop not found")
        shop_rows = cast("list[dict[str, Any]]", shop_resp.data)
        shop_name = first(shop_rows, "shop name lookup")["name"] or "your shop"

        existing = await asyncio.to_thread(
            lambda: (
                self._db.table("shop_claims")
                .select("id")
                .eq("shop_id", shop_id)
                .in_("status", ["pending", "approved"])
                .execute()
            )
        )
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="此咖啡廳已有待審核或已通過的認領申請",
            )

        result = await asyncio.to_thread(
            lambda: (
                self._db.table("shop_claims")
                .insert(
                    {
                        "shop_id": shop_id,
                        "user_id": user_id,
                        "contact_name": contact_name,
                        "contact_email": contact_email,
                        "role": role,
                        "proof_photo_url": proof_photo_path,
                    }
                )
                .execute()
            )
        )

        claim = first(cast("list[dict[str, Any]]", result.data), "insert claim")

        try:
            await self._email.send(
                EmailMessage(
                    to=contact_email,
                    subject="認領申請已收到 — 48小時內回覆",
                    html=(
                        f"<p>您好 {contact_name}，</p>"
                        f"<p>我們已收到您對 <strong>{shop_name}</strong> 的認領申請。"
                        "我們會在 48 小時內完成審核，並以此信箱通知您結果。</p>"
                        "<p>CafeRoam 團隊</p>"
                    ),
                )
            )

            await self._email.send(
                EmailMessage(
                    to=settings.admin_email,
                    subject=f"[CafeRoam] New claim: {shop_name}",
                    html=(
                        f"<p>New claim submitted for <strong>{shop_name}</strong> "
                        f"(shop_id: {shop_id}).</p>"
                        f"<p>Claimant: {contact_name} &lt;{contact_email}&gt;, role: {role}</p>"
                        f"<p>Proof photo: {proof_photo_path}</p>"
                        "<p>Review in the admin panel: /admin</p>"
                    ),
                )
            )
        except Exception:
            logger.warning(
                "Post-claim email failed",
                shop_id=shop_id,
                user_id=user_id,
                exc_info=True,
            )

        logger.info("Claim submitted", shop_id=shop_id, user_id=user_id)
        return claim

    async def approve_claim(self, claim_id: str, admin_user_id: str) -> None:
        """Approve a claim: update status, assign shop_owner role, email owner."""
        result = await asyncio.to_thread(
            lambda: (
                self._db.table("shop_claims")
                .select("id, shop_id, user_id, contact_email, contact_name")
                .eq("id", claim_id)
                .single()
                .execute()
            )
        )
        claim: dict[str, Any] = cast("dict[str, Any]", result.data)
        if not claim:
            raise HTTPException(status_code=404, detail="Claim not found")

        await asyncio.to_thread(
            lambda: (
                self._db.table("shop_claims")
                .update(
                    {
                        "status": "approved",
                        "reviewed_at": datetime.now(UTC).isoformat(),
                        "reviewed_by": admin_user_id,
                    }
                )
                .eq("id", claim_id)
                .execute()
            )
        )

        # Assign shop_owner role. upsert with ignore_duplicates=True maps to
        # INSERT ... ON CONFLICT DO NOTHING, so re-approvals are safe.
        await asyncio.to_thread(
            lambda: (
                self._db.table("user_roles")
                .upsert(
                    {
                        "user_id": claim["user_id"],
                        "role": "shop_owner",
                        "granted_by": admin_user_id,
                    },
                    ignore_duplicates=True,
                )
                .execute()
            )
        )

        shop_id = claim["shop_id"]
        await self._email.send(
            EmailMessage(
                to=claim["contact_email"],
                subject="已通過認領 — 前往您的管理後台",
                html=(
                    f"<p>您好 {claim['contact_name']}，</p>"
                    "<p>恭喜！您的認領申請已通過審核。"
                    f"您的管理後台：<a href='{settings.site_url}/owner/{shop_id}/dashboard'>"
                    "前往後台</a></p>"
                    "<p>CafeRoam 團隊</p>"
                ),
            )
        )
        logger.info("Claim approved", claim_id=claim_id, admin=admin_user_id)

    async def reject_claim(self, claim_id: str, reason: str, admin_user_id: str) -> None:
        """Reject a claim: update status, email owner."""
        result = await asyncio.to_thread(
            lambda: (
                self._db.table("shop_claims")
                .select("id, contact_email, contact_name")
                .eq("id", claim_id)
                .single()
                .execute()
            )
        )
        claim: dict[str, Any] = cast("dict[str, Any]", result.data)
        if not claim:
            raise HTTPException(status_code=404, detail="Claim not found")

        await asyncio.to_thread(
            lambda: (
                self._db.table("shop_claims")
                .update(
                    {
                        "status": "rejected",
                        "rejection_reason": reason,
                        "reviewed_at": datetime.now(UTC).isoformat(),
                        "reviewed_by": admin_user_id,
                    }
                )
                .eq("id", claim_id)
                .execute()
            )
        )

        reason_labels = {
            "invalid_proof": "提供的證明照片無法驗證",
            "not_an_owner": "提交者不具店主身份",
            "duplicate_request": "此咖啡廳已被認領",
            "other": "其他原因",
        }
        reason_label = reason_labels.get(reason, reason)

        await self._email.send(
            EmailMessage(
                to=claim["contact_email"],
                subject="認領申請未通過",
                html=(
                    f"<p>您好 {claim['contact_name']}，</p>"
                    f"<p>很抱歉，您的認領申請未通過審核。原因：{reason_label}。</p>"
                    f"<p>如有疑問，請聯絡 {settings.admin_email}。</p>"
                    "<p>CafeRoam 團隊</p>"
                ),
            )
        )
        logger.info("Claim rejected", claim_id=claim_id, reason=reason)

    async def list_claims(self, status: str | None = "pending") -> list[dict[str, Any]]:
        """List claims, optionally filtered by status. For admin use."""
        query = (
            self._db.table("shop_claims")
            .select(
                "id, shop_id, user_id, status, contact_name, contact_email, "
                "role, created_at, shops(name, address)"
            )
            .order("created_at", desc=True)
            .limit(50)
        )
        if status:
            query = query.eq("status", status)
        result = await asyncio.to_thread(lambda: query.execute())
        return cast("list[dict[str, Any]]", result.data or [])
