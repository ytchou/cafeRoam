"""Tool schemas are imported by anthropic and openai adapters; these tests lock the shape."""

from providers.llm._tool_schemas import (
    ASSIGN_TAROT_SCHEMA,
    CLASSIFY_PHOTO_SCHEMA,
    CLASSIFY_SHOP_SCHEMA,
    EXTRACT_MENU_SCHEMA,
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
