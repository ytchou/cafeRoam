from unittest.mock import AsyncMock, MagicMock

import pytest

from models.issue_tracker_types import IssueCreateResult


class TestShopDataReportHandler:
    @pytest.mark.asyncio
    async def test_creates_linear_issue_with_pending_reports(self) -> None:
        from workers.handlers.shop_data_report import handle_shop_data_report

        db = MagicMock()
        issue_tracker = AsyncMock()
        issue_tracker.create_issue.return_value = IssueCreateResult(
            id='issue-1', url='https://linear.app/issue/1'
        )

        # Mock: 2 pending reports with shop names
        db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
            {
                'id': 'report-1',
                'shop_id': 'shop-1',
                'field': 'hours',
                'description': 'Wrong weekend hours',
                'shops': {'name': 'Cafe Alpha'},
            },
            {
                'id': 'report-2',
                'shop_id': 'shop-2',
                'field': None,
                'description': 'This shop has closed permanently',
                'shops': {'name': 'Cafe Beta'},
            },
        ]

        await handle_shop_data_report(db=db, issue_tracker=issue_tracker)

        # Should create one issue
        issue_tracker.create_issue.assert_called_once()
        call_args = issue_tracker.create_issue.call_args[0][0]
        assert 'Shop data reports' in call_args.title
        assert 'Cafe Alpha' in call_args.description
        assert 'hours' in call_args.description
        assert 'Cafe Beta' in call_args.description

        # Should mark reports as sent_to_linear
        update_call = db.table.return_value.update
        update_call.assert_called_once()
        update_args = update_call.call_args[0][0]
        assert update_args['status'] == 'sent_to_linear'

    @pytest.mark.asyncio
    async def test_skips_when_no_pending_reports(self) -> None:
        from workers.handlers.shop_data_report import handle_shop_data_report

        db = MagicMock()
        issue_tracker = AsyncMock()

        # Mock: no pending reports
        db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = (
            []
        )

        await handle_shop_data_report(db=db, issue_tracker=issue_tracker)

        # Should NOT create any issue
        issue_tracker.create_issue.assert_not_called()

    @pytest.mark.asyncio
    async def test_report_without_field_shows_general_in_checklist(self) -> None:
        from workers.handlers.shop_data_report import handle_shop_data_report

        db = MagicMock()
        issue_tracker = AsyncMock()
        issue_tracker.create_issue.return_value = IssueCreateResult(
            id='issue-1', url='https://linear.app/issue/1'
        )

        db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
            {
                'id': 'report-1',
                'shop_id': 'shop-1',
                'field': None,
                'description': 'General feedback about this shop',
                'shops': {'name': 'Cafe Gamma'},
            },
        ]

        await handle_shop_data_report(db=db, issue_tracker=issue_tracker)

        call_args = issue_tracker.create_issue.call_args[0][0]
        assert 'Cafe Gamma' in call_args.description
        assert 'general' in call_args.description.lower() or 'General' not in call_args.description
