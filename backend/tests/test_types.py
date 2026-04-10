from models.types import ReviewTopic, ReviewSummaryResult, Shop


def test_review_topic_model():
    topic = ReviewTopic(topic="手沖咖啡", count=8)
    assert topic.topic == "手沖咖啡"
    assert topic.count == 8


def test_review_summary_result_model():
    result = ReviewSummaryResult(
        summary_zh_tw="咖啡很棒，適合安靜工作。",
        review_topics=[ReviewTopic(topic="手沖咖啡", count=8), ReviewTopic(topic="安靜", count=5)],
    )
    assert result.summary_zh_tw == "咖啡很棒，適合安靜工作。"
    assert len(result.review_topics) == 2
    assert result.review_topics[0].topic == "手沖咖啡"


def test_shop_model_has_review_topics_field():
    from datetime import datetime

    shop = Shop(
        id="123",
        name="Test",
        address="addr",
        processing_status="live",
        review_count=0,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )
    assert shop.review_topics is None  # default


def test_shop_model_accepts_review_topics():
    from datetime import datetime

    shop = Shop(
        id="123",
        name="Test",
        address="addr",
        processing_status="live",
        review_count=0,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        review_topics=[{"topic": "手沖", "count": 5}],
    )
    assert len(shop.review_topics) == 1
