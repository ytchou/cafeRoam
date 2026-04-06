from core.config import settings
from providers.issue_tracker.interface import IssueTrackerProvider


def get_issue_tracker_provider() -> IssueTrackerProvider:
    match settings.issue_tracker_provider:
        case "linear":
            from providers.issue_tracker.linear_adapter import LinearIssueTrackerAdapter

            return LinearIssueTrackerAdapter(
                api_key=settings.linear_api_key,
                team_id=settings.linear_team_id,
            )
        case _:
            raise ValueError(f"Unknown issue tracker provider: {settings.issue_tracker_provider}")
