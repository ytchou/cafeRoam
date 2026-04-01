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
        # 1. Get shop's payment_methods JSONB
        shop_resp = (
            self._db.table("shops")
            .select("payment_methods")
            .eq("id", shop_id)
            .single()
            .execute()
        )
        shop_data = cast("dict[str, Any]", shop_resp.data)
        pm: dict[str, bool | None] = shop_data.get("payment_methods") or {}

        # 2. Get confirmation counts grouped by method + majority vote
        conf_resp = (
            self._db.table("shop_payment_confirmations")
            .select("method, vote, count(*).as_.cnt")  # type: ignore[arg-type]
            .eq("shop_id", shop_id)
            .execute()
        )
        confirmations = cast("list[dict[str, Any]]", conf_resp.data or [])
        conf_counts: dict[str, int] = {}
        for row in confirmations:
            method = row["method"]
            conf_counts[method] = conf_counts.get(method, 0) + int(row.get("cnt", 1))

        # 3. Get user's own votes if authenticated
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

        # 4. Build response — only include methods with non-null values
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

        # Get updated count for this method
        conf_resp = (
            self._db.table("shop_payment_confirmations")
            .select("method, vote, count(*).as_.cnt")  # type: ignore[arg-type]
            .eq("shop_id", shop_id)
            .eq("method", method)
            .execute()
        )
        data = cast("list[dict[str, Any]]", conf_resp.data or [])
        count = sum(int(row.get("cnt", 1)) for row in data)

        return PaymentConfirmResponse(
            method=method,
            vote=vote,
            confirmation_count=count,
        )
