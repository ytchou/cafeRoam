"""Shared tool/function JSON schemas for LLM adapters.

Each schema uses Anthropic's envelope ({name, description, input_schema}) as the
canonical form. The OpenAI adapter rewraps these at call time into its
function_calling envelope ({type: "function", function: {name, description, parameters}}).
"""

from typing import Any

from core.tarot_vocabulary import TAROT_TITLES

CLASSIFY_SHOP_SCHEMA: dict[str, Any] = {
    "name": "classify_shop",
    "description": "Classify a coffee shop based on its reviews using the provided taxonomy",
    "input_schema": {
        "type": "object",
        "properties": {
            "tags": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Tag ID from the taxonomy list"},
                        "confidence": {
                            "type": "number",
                            "description": "Confidence score 0.0-1.0",
                        },
                    },
                    "required": ["id", "confidence"],
                },
                "description": "Tags that apply to this shop, selected from the taxonomy",
            },
            "summary": {
                "type": "string",
                "description": (
                    "2-3 sentence natural language profile of the shop "
                    "in Traditional Chinese (繁體中文)"
                ),
            },
            "topReviews": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 most informative review excerpts",
            },
            "mode": {
                "type": "string",
                "enum": ["work", "rest", "social", "mixed"],
                "description": "Primary usage mode for this shop",
            },
            "menu_highlights": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Specific food or drink items mentioned in reviews "
                    "(e.g. 巴斯克蛋糕, 司康, 手沖, 冷萃). "
                    "Only include items explicitly mentioned by name. Max 10."
                ),
            },
            "coffee_origins": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Specific coffee origins or varieties mentioned "
                    "(e.g. 耶加雪菲, 藝伎, 衣索比亞). "
                    "Use Traditional Chinese names. Max 5."
                ),
            },
            "menu_items": {
                "type": "array",
                "description": (
                    "Structured menu items extracted from reviews. "
                    "Include specific drinks, food, and desserts mentioned by name."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Item name in original language",
                        },
                        "price": {
                            "type": "number",
                            "description": "Price in TWD if mentioned",
                        },
                        "category": {
                            "type": "string",
                            "description": "One of: coffee, tea, drink, food, dessert, other",
                        },
                    },
                    "required": ["name"],
                },
                "maxItems": 20,
            },
        },
        "required": ["tags", "summary", "mode"],
    },
}

EXTRACT_MENU_SCHEMA: dict[str, Any] = {
    "name": "extract_menu",
    "description": "Extract structured menu items from a coffee shop menu image",
    "input_schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "price": {"type": "number"},
                        "description": {"type": "string"},
                        "category": {"type": "string"},
                    },
                    "required": ["name"],
                },
            },
            "raw_text": {"type": "string"},
        },
        "required": ["items"],
    },
}

ASSIGN_TAROT_SCHEMA: dict[str, Any] = {
    "name": "assign_tarot",
    "description": "Assign a mystical tarot archetype title and flavor text to a coffee shop",
    "input_schema": {
        "type": "object",
        "properties": {
            "tarot_title": {
                "type": "string",
                "enum": list(TAROT_TITLES),
                "description": "The tarot archetype title that best fits this shop",
            },
            "flavor_text": {
                "type": "string",
                "description": (
                    "One evocative sentence in the style of a tarot reading. Max 80 characters."
                ),
            },
        },
        "required": ["tarot_title", "flavor_text"],
    },
}

CLASSIFY_PHOTO_SCHEMA: dict[str, Any] = {
    "name": "classify_photo",
    "description": "Classify a coffee shop photo into one category.",
    "input_schema": {
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "enum": ["MENU", "VIBE", "SKIP"],
                "description": (
                    "MENU: photo contains readable menu board, price list, or drink list text. "
                    "VIBE: photo shows shop ambience, interior, exterior, or food/drinks. "
                    "SKIP: photo is blurry, irrelevant, or primarily shows people."
                ),
            },
        },
        "required": ["category"],
    },
}

SUMMARIZE_REVIEWS_TOOL_SCHEMA: dict[str, Any] = {
    "name": "summarize_reviews",
    "description": (
        "Generate a blended community summary and extract recurring topic chips "
        "from Google reviews and community check-in notes. "
        "Output in Traditional Chinese (繁體中文) where possible."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "summary_zh_tw": {
                "type": "string",
                "description": (
                    "2–4 sentences in Traditional Chinese (繁體中文), max 200 characters. "
                    "Focus on drinks, food, atmosphere, and work-suitability. "
                    "When community notes are present, weight them more heavily "
                    "than Google reviews."
                ),
            },
            "review_topics": {
                "type": "array",
                "description": (
                    "Top 8–10 recurring topics mentioned across all reviews, "
                    "with estimated mention counts."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "topic": {
                            "type": "string",
                            "description": (
                                "Topic label in Traditional Chinese "
                                "(or English if the review used English). "
                                "E.g. '手沖咖啡', 'vintage vibe', '插座充足'."
                            ),
                        },
                        "count": {
                            "type": "integer",
                            "description": (
                                "Estimated number of reviews/notes mentioning this topic."
                            ),
                        },
                    },
                    "required": ["topic", "count"],
                },
                "minItems": 1,
                "maxItems": 10,
            },
        },
        "required": ["summary_zh_tw", "review_topics"],
    },
}
