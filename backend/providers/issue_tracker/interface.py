from typing import Protocol

from models.issue_tracker_types import IssueCreateRequest, IssueCreateResult


class IssueTrackerProvider(Protocol):
    async def create_issue(self, request: IssueCreateRequest) -> IssueCreateResult: ...
