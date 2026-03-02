from unittest.mock import MagicMock, patch

from middleware.admin_audit import log_admin_action

ADMIN_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
SHOP_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"


class TestAdminAuditLog:
    def test_every_admin_action_is_recorded_for_audit_trail(self):
        """Given a valid admin action, it is persisted to the audit log."""
        mock_db = MagicMock()
        with patch("middleware.admin_audit.get_service_role_client", return_value=mock_db):
            log_admin_action(
                admin_user_id=ADMIN_USER_ID,
                action="POST /admin/shops",
                target_type="shop",
                target_id=SHOP_ID,
            )
        mock_db.table.assert_called_once_with("admin_audit_logs")
        mock_db.table.return_value.insert.assert_called_once_with(
            {
                "admin_user_id": ADMIN_USER_ID,
                "action": "POST /admin/shops",
                "target_type": "shop",
                "target_id": SHOP_ID,
                "payload": None,
            }
        )

    def test_never_raises_on_db_error(self):
        """Given a database failure, audit logging should be swallowed silently."""
        mock_db = MagicMock()
        mock_db.table.side_effect = Exception("DB down")
        with patch("middleware.admin_audit.get_service_role_client", return_value=mock_db):
            # Should not raise
            log_admin_action(
                admin_user_id=ADMIN_USER_ID,
                action="POST /admin/shops",
                target_type="shop",
            )
