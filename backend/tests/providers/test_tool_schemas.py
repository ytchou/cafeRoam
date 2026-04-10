"""Tool schemas are imported by anthropic and openai adapters; these tests lock the shape."""

from providers.llm._tool_schemas import (
    ASSIGN_TAROT_SCHEMA,
    CLASSIFY_PHOTO_SCHEMA,
    CLASSIFY_SHOP_SCHEMA,
    EXTRACT_MENU_SCHEMA,
    SUMMARIZE_REVIEWS_TOOL_SCHEMA,
)


def test_classify_shop_schema_exposes_required_fields():
    assert CLASSIFY_SHOP_SCHEMA["name"] == "classify_shop"
    props = CLASSIFY_SHOP_SCHEMA["input_schema"]["properties"]
    assert {"tags", "summary", "mode", "menu_highlights", "coffee_origins"}.issubset(props.keys())


def test_extract_menu_schema_expects_items_array():
    assert EXTRACT_MENU_SCHEMA["name"] == "extract_menu"
    props = EXTRACT_MENU_SCHEMA["input_schema"]["properties"]
    assert props["items"]["type"] == "array"


def test_assign_tarot_schema_enum_matches_tarot_titles():
    from core.tarot_vocabulary import TAROT_TITLES

    enum = ASSIGN_TAROT_SCHEMA["input_schema"]["properties"]["tarot_title"]["enum"]
    assert enum == list(TAROT_TITLES)


def test_classify_photo_schema_enum_is_menu_vibe_skip():
    enum = CLASSIFY_PHOTO_SCHEMA["input_schema"]["properties"]["category"]["enum"]
    assert enum == ["MENU", "VIBE", "SKIP"]


def test_summarize_reviews_tool_schema_has_correct_name():
    assert SUMMARIZE_REVIEWS_TOOL_SCHEMA["name"] == "summarize_reviews"


def test_summarize_reviews_tool_schema_has_summary_field():
    props = SUMMARIZE_REVIEWS_TOOL_SCHEMA["input_schema"]["properties"]
    assert "summary_zh_tw" in props
    assert props["summary_zh_tw"]["type"] == "string"


def test_summarize_reviews_tool_schema_has_review_topics_array():
    props = SUMMARIZE_REVIEWS_TOOL_SCHEMA["input_schema"]["properties"]
    assert "review_topics" in props
    assert props["review_topics"]["type"] == "array"
    item_props = props["review_topics"]["items"]["properties"]
    assert "topic" in item_props
    assert "count" in item_props
    assert item_props["count"]["type"] == "integer"


def test_summarize_reviews_tool_schema_required_fields():
    required = SUMMARIZE_REVIEWS_TOOL_SCHEMA["input_schema"]["required"]
    assert "summary_zh_tw" in required
    assert "review_topics" in required
