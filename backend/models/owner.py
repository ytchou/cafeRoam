from __future__ import annotations
from typing import Annotated, Optional
from pydantic import BaseModel, Field


class OwnerStoryIn(BaseModel):
    title: Optional[str] = None
    body: str = Field(..., min_length=10, max_length=5000)
    photo_url: Optional[str] = None
    is_published: bool = False


class OwnerStoryOut(BaseModel):
    id: str
    shop_id: str
    title: Optional[str]
    body: str
    photo_url: Optional[str]
    is_published: bool
    created_at: str
    updated_at: str


class ShopInfoIn(BaseModel):
    description: Optional[str] = Field(None, max_length=1000)
    opening_hours: Optional[dict] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class OwnerTagsIn(BaseModel):
    tags: Annotated[list[str], Field(min_length=0, max_length=10)]


class ReviewResponseIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class ReviewResponseOut(BaseModel):
    id: str
    checkin_id: str
    body: str
    created_at: str


class DashboardStats(BaseModel):
    checkin_count_30d: int
    follower_count: int
    saves_count_30d: int
    page_views_30d: int


class SearchInsight(BaseModel):
    query: str
    impressions: int


class CommunityPulseTag(BaseModel):
    tag: str
    count: int


class DistrictRanking(BaseModel):
    attribute: str
    rank: int
    total_in_district: int


class DashboardAnalytics(BaseModel):
    search_insights: list[SearchInsight]
    community_pulse: list[CommunityPulseTag]
    district_rankings: list[DistrictRanking]
