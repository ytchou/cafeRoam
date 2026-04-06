import httpx
import structlog

from core.db import first
from models.issue_tracker_types import IssueCreateRequest, IssueCreateResult

logger = structlog.get_logger()

LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql"

CREATE_ISSUE_MUTATION = """
mutation IssueCreate(
    $title: String!,
    $description: String!,
    $teamId: String!,
    $labelIds: [String!]
) {
    issueCreate(input: {
        title: $title,
        description: $description,
        teamId: $teamId,
        labelIds: $labelIds
    }) {
        success
        issue {
            id
            url
        }
    }
}
"""


class LinearIssueTrackerAdapter:
    def __init__(self, api_key: str, team_id: str):
        self._api_key = api_key
        self._team_id = team_id

    async def create_issue(self, request: IssueCreateRequest) -> IssueCreateResult:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LINEAR_GRAPHQL_URL,
                headers={
                    "Authorization": self._api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "query": CREATE_ISSUE_MUTATION,
                    "variables": {
                        "title": request.title,
                        "description": request.description,
                        "teamId": self._team_id,
                        "labelIds": request.labels,
                    },
                },
            )

        data = response.json()
        result = data.get("data", {}).get("issueCreate", {})

        if not result.get("success"):
            errors = data.get("errors", [])
            first_error = first(errors, "Linear errors")
            error_msg = first_error.get("message", "Unknown error") if errors else "Unknown error"
            logger.error("Linear API error", error=error_msg)
            raise RuntimeError(f"Linear API error: {error_msg}")

        issue = result["issue"]
        logger.info("Created Linear issue", issue_id=issue["id"], url=issue["url"])
        return IssueCreateResult(id=issue["id"], url=issue["url"])
