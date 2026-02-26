import pytest
from models.types import (
    JobType,
    ShopSubmission,
    ActivityFeedEvent,
    ProcessingStatus,
)


def test_new_job_types_exist():
    assert JobType.SCRAPE_SHOP == "scrape_shop"
    assert JobType.PUBLISH_SHOP == "publish_shop"
    assert JobType.ADMIN_DIGEST_EMAIL == "admin_digest_email"


def test_processing_status_values():
    assert ProcessingStatus.PENDING == "pending"
    assert ProcessingStatus.LIVE == "live"
    assert ProcessingStatus.FAILED == "failed"


def test_shop_submission_model():
    sub = ShopSubmission(
        id="123",
        submitted_by="user-1",
        google_maps_url="https://maps.google.com/?cid=123",
        status="pending",
    )
    assert sub.google_maps_url == "https://maps.google.com/?cid=123"
    assert sub.shop_id is None


def test_activity_feed_event_model():
    event = ActivityFeedEvent(
        id="456",
        event_type="shop_added",
        shop_id="shop-1",
        metadata={"shop_name": "Test Cafe"},
    )
    assert event.actor_id is None
    assert event.event_type == "shop_added"
