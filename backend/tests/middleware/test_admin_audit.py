from unittest.mock import MagicMock, patch

from middleware.admin_audit import log_admin_action


class TestAdminAuditLog:
    def test_logs_action_to_database(self):
        """Given an admin action, when log_admin_action is called, it inserts a row into admin_audit_logs."""
        mock_db = MagicMock()
        with patch("middleware.admin_audit.get_service_role_client", return_value=mock_db):
            log_admin_action(
                admin_user_id="admin-123",
                action="POST /admin/shops",
                target_type="shop",
                target_id="shop-456",
            )
        mock_db.table.assert_called_once_with("admin_audit_logs")
        insert_call = mock_db.table.return_value.insert
        insert_call.assert_called_once()
        row = insert_call.call_args[0][0]
        assert row["admin_user_id"] == "admin-123"
        assert row["action"] == "POST /admin/shops"
        assert row["target_type"] == "shop"
        assert row["target_id"] == "shop-456"

    def test_never_raises_on_db_error(self):
        """Given a database failure, audit logging should be swallowed silently."""
        mock_db = MagicMock()
        mock_db.table.side_effect = Exception("DB down")
        with patch("middleware.admin_audit.get_service_role_client", return_value=mock_db):
            # Should not raise
            log_admin_action(
                admin_user_id="admin-123",
                action="POST /admin/shops",
                target_type="shop",
            )
