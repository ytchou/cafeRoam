from pydantic import BaseModel


class IssueCreateRequest(BaseModel):
    title: str
    description: str
    labels: list[str] = []


class IssueCreateResult(BaseModel):
    id: str
    url: str
