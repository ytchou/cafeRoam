from unittest.mock import AsyncMock, patch

import pytest

from models.issue_tracker_types import IssueCreateRequest, IssueCreateResult
from providers.issue_tracker.linear_adapter import LinearIssueTrackerAdapter


class TestLinearIssueTrackerAdapter:
    @pytest.fixture
    def adapter(self) -> LinearIssueTrackerAdapter:
        return LinearIssueTrackerAdapter(
            api_key="test-api-key",
            team_id="test-team-id",
        )

    @pytest.mark.asyncio
    async def test_create_issue_sends_graphql_mutation(
        self, adapter: LinearIssueTrackerAdapter
    ) -> None:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "issueCreate": {
                    "success": True,
                    "issue": {
                        "id": "issue-123",
                        "url": "https://linear.app/team/issue/DEV-999",
                    },
                }
            }
        }

        with patch("providers.issue_tracker.linear_adapter.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            result = await adapter.create_issue(
                IssueCreateRequest(
                    title="Shop data reports — 2026-04-06",
                    description="- [ ] **Test Shop** (hours): Wrong hours listed",
                    labels=["data-quality"],
                )
            )

            assert result.id == "issue-123"
            assert result.url == "https://linear.app/team/issue/DEV-999"
            mock_client.post.assert_called_once()
            call_kwargs = mock_client.post.call_args
            assert call_kwargs[0][0] == "https://api.linear.app/graphql"
            assert "Authorization" in call_kwargs[1]["headers"]

    @pytest.mark.asyncio
    async def test_create_issue_raises_on_api_error(
        self, adapter: LinearIssueTrackerAdapter
    ) -> None:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {"issueCreate": {"success": False, "issue": None}},
            "errors": [{"message": "Team not found"}],
        }

        with patch("providers.issue_tracker.linear_adapter.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            with pytest.raises(RuntimeError, match="Linear API error"):
                await adapter.create_issue(
                    IssueCreateRequest(title="Test", description="Test")
                )
