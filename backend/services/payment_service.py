"""Service for payment method queries and community confirmations."""

from typing import Any, cast

from supabase import Client

from models.types import (
    PaymentConfirmResponse,
    PaymentMethodsResponse,
    PaymentMethodView,
)


class PaymentService:
    def __init__(self, db: Client) -> None:
        self._db = db

    def get_payment_methods(
        self, *, shop_id: str, user_id: str | None
    ) -> PaymentMethodsResponse:
        """Get payment methods for a shop, merged with community confirmations."""
        shop_resp = (
            self._db.table("shops")
            .select("payment_methods")
            .eq("id", shop_id)
            .single()
            .execute()
        )
        shop_data = cast("dict[str, Any]", shop_resp.data)
        pm: dict[str, bool | None] = shop_data.get("payment_methods") or {}

        conf_resp = (
            self._db.table("shop_payment_confirmations")
            .select("method")
            .eq("shop_id", shop_id)
            .eq("vote", True)
            .execute()
        )
        confirmations = cast("list[dict[str, Any]]", conf_resp.data or [])
        conf_counts: dict[str, int] = {}
        for row in confirmations:
            method = row["method"]
            conf_counts[method] = conf_counts.get(method, 0) + 1

        user_votes: dict[str, bool] = {}
        if user_id:
            votes_resp = (
                self._db.table("shop_payment_confirmations")
                .select("method, vote")
                .eq("shop_id", shop_id)
                .eq("user_id", user_id)
                .execute()
            )
            for row in cast("list[dict[str, Any]]", votes_resp.data or []):
                user_votes[row["method"]] = row["vote"]

        methods: list[PaymentMethodView] = []
        for method_key, accepted in pm.items():
            if accepted is None:
                continue
            methods.append(
                PaymentMethodView(
                    method=method_key,
                    accepted=accepted,
                    confirmation_count=conf_counts.get(method_key, 0),
                    user_vote=user_votes.get(method_key),
                )
            )

        return PaymentMethodsResponse(methods=methods)

    def upsert_confirmation(
        self, *, shop_id: str, user_id: str, method: str, vote: bool
    ) -> PaymentConfirmResponse:
        """Insert or update a user's payment method confirmation."""
        self._db.table("shop_payment_confirmations").upsert(
            {
                "shop_id": shop_id,
                "user_id": user_id,
                "method": method,
                "vote": vote,
            },
            on_conflict="shop_id,user_id,method",
        ).execute()

        # Get updated positive confirmation count for this method
        conf_resp = (
            self._db.table("shop_payment_confirmations")
            .select("id")
            .eq("shop_id", shop_id)
            .eq("method", method)
            .eq("vote", True)
            .execute()
        )
        count = len(conf_resp.data or [])

        return PaymentConfirmResponse(
            method=method,
            vote=vote,
            confirmation_count=count,
        )
