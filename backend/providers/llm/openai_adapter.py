"""OpenAI LLM adapter — mirrors AnthropicLLMAdapter's protocol shape.

Tool schemas use Anthropic's envelope (name, description, input_schema) as canonical form.
This adapter rewraps them into OpenAI's function_calling envelope at call time.
"""

import json
from typing import Any, cast

from core.tarot_vocabulary import TAROT_TITLES, TITLE_TO_TAGS
from models.types import (
    EnrichmentResult,
    MenuExtractionResult,
    PhotoCategory,
    ReviewSummaryResult,
    ReviewTopic,
    ShopEnrichmentInput,
    TarotEnrichmentResult,
    TaxonomyTag,
)
from providers.cost import compute_llm_cost
from providers.api_usage_logger import log_api_usage
from providers.llm._tool_schemas import (
    ASSIGN_TAROT_SCHEMA,
    CLASSIFY_PHOTO_SCHEMA,
    CLASSIFY_SHOP_SCHEMA,
    EXTRACT_MENU_SCHEMA,
    SUMMARIZE_REVIEWS_TOOL_SCHEMA,
)
from providers.llm.anthropic_adapter import (
    _MENU_VOCAB_REF,
    _SPECIALTY_VOCAB_REF,
    _SUMMARIZE_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    TAROT_SYSTEM_PROMPT,
    _parse_enrichment_payload,
)


def _wrap_schema_for_openai(schema: dict[str, Any]) -> dict[str, Any]:
    """Convert Anthropic-style schema envelope to OpenAI function_calling envelope."""
    return {
        "type": "function",
        "function": {
            "name": schema["name"],
            "description": schema["description"],
            "parameters": schema["input_schema"],
        },
    }


def _extract_tool_input(response: Any, expected_name: str) -> dict[str, Any]:
    """Extract and parse tool call arguments from an OpenAI ChatCompletion response.

    Raises RuntimeError if no tool_call is present or if arguments are not valid JSON.
    """
    message = response.choices[0].message
    if not message.tool_calls:
        raise RuntimeError(
            f"Expected a tool_call for '{expected_name}' but response had no tool_calls. "
            f"Content: {message.content!r}"
        )
    tool_call = message.tool_calls[0]
    try:
        return cast("dict[str, Any]", json.loads(tool_call.function.arguments))
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Failed to parse tool_call arguments as JSON for '{expected_name}': {exc}"
        ) from exc


def _build_enrich_messages(
    shop: ShopEnrichmentInput,
    taxonomy: list[TaxonomyTag],
) -> list[dict[str, Any]]:
    """Build OpenAI messages list for enrich_shop."""
    lines = [
        "Classify this coffee shop based on its reviews and attributes.",
        "",
        f"Shop: {shop.name}",
    ]
    if shop.categories:
        lines.append(f"Categories: {', '.join(shop.categories)}")
    if shop.price_range:
        lines.append(f"Price range: {shop.price_range}")
    if shop.socket:
        lines.append(f"Socket: {shop.socket}")
    if shop.limited_time:
        lines.append(f"Limited time: {shop.limited_time}")
    if shop.rating is not None:
        count_str = f" ({shop.review_count} reviews)" if shop.review_count else ""
        lines.append(f"Rating: {shop.rating}{count_str}")
    if shop.description:
        lines.append(f"Description: {shop.description}")
    if shop.reviews:
        lines.append("")
        lines.append(f"Reviews ({len(shop.reviews)}):")
        for i, review in enumerate(shop.reviews, 1):
            lines.append(f"[{i}] {review}")
    lines.append("")
    lines.append("Available taxonomy tags (ONLY select from this list):")
    for tag in taxonomy:
        lines.append(f"  {tag.id} ({tag.dimension}) — {tag.label} / {tag.label_zh}")
    lines.append("")
    lines.append("Reference — food & drink items (use exact terms for menu_highlights):")
    lines.append(_MENU_VOCAB_REF)
    lines.append("")
    lines.append(
        "Reference — coffee origins, varieties & processing"
        " (use Traditional Chinese names for coffee_origins):"
    )
    lines.append(_SPECIALTY_VOCAB_REF)
    lines.append("")
    lines.append(
        "Instruction: When extracting coffee_origins, use the Traditional Chinese name"
        " exactly as it appears in the reference list above"
        " (e.g. 古吉 not 'Guji', 耶加雪菲 not 'Yirgacheffe')."
        " For menu_highlights, prefer the Traditional Chinese term from the list"
        " (e.g. 手沖 not 'pour over', 可頌 not 'croissant')."
    )
    if shop.google_maps_features:
        feature_list = ", ".join(k for k, v in shop.google_maps_features.items() if v)
        if feature_list:
            lines.append("")
            lines.append(
                f"Confirmed Google Maps features: {feature_list}. "
                "Assign confidence >= 0.9 to tags matching confirmed features."
            )
    text_prompt = "\n".join(lines)

    system_message = {"role": "system", "content": SYSTEM_PROMPT}
    if not shop.vibe_photo_urls:
        return [system_message, {"role": "user", "content": text_prompt}]

    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                "The following photos show the shop's physical space and vibe. "
                "Use them to assess visual attributes like aesthetic style, ambience, "
                "and physical features."
            ),
        }
    ]
    for url in shop.vibe_photo_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})
    content.append({"type": "text", "text": text_prompt})
    return [system_message, {"role": "user", "content": content}]


class OpenAILLMAdapter:
    def __init__(
        self,
        api_key: str,
        model: str,
        classify_model: str,
        nano_model: str,
        taxonomy: list[TaxonomyTag],
    ) -> None:
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model
        self._classify_model = classify_model
        self._nano_model = nano_model
        self._taxonomy = taxonomy
        self._taxonomy_by_id: dict[str, TaxonomyTag] = {tag.id: tag for tag in taxonomy}
        # max_completion_tokens is used throughout this adapter because all targeted models
        # (gpt-5.4 series) support it. If this adapter is ever extended to non-reasoning
        # GPT models, replace max_completion_tokens with max_tokens for those calls.

    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult:
        messages = _build_enrich_messages(shop, self._taxonomy)
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=cast("list[Any]", messages),
            tools=cast("Any", [_wrap_schema_for_openai(CLASSIFY_SHOP_SCHEMA)]),
            tool_choice=cast(
                "Any",
                {"type": "function", "function": {"name": "classify_shop"}},
            ),
            max_completion_tokens=2048,
        )
        _usage = response.usage
        if _usage is not None:
            log_api_usage(
                provider="openai",
                task="enrich_shop",
                model=self._model,
                tokens_input=_usage.prompt_tokens,
                tokens_output=_usage.completion_tokens,
                cost_usd=compute_llm_cost(
                    self._model,
                    _usage.prompt_tokens,
                    _usage.completion_tokens,
                ),
            )
        payload = _extract_tool_input(response, "classify_shop")
        return _parse_enrichment_payload(payload, self._taxonomy_by_id)

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult:
        messages: list[dict[str, Any]] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Extract every individual menu item visible in this image. "
                            "Each item must have its exact name as written on the menu "
                            "(including the original language). Do NOT group items into "
                            "categories — list each drink, food, or product as a separate "
                            "item with its name and price if visible."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]
        response = await self._client.chat.completions.create(
            model=self._classify_model,
            messages=cast("list[Any]", messages),
            tools=cast("Any", [_wrap_schema_for_openai(EXTRACT_MENU_SCHEMA)]),
            tool_choice=cast(
                "Any",
                {"type": "function", "function": {"name": "extract_menu"}},
            ),
            max_completion_tokens=4096,
            temperature=0,
        )
        payload = _extract_tool_input(response, "extract_menu")
        return MenuExtractionResult(
            items=payload.get("items", []) or [],
            raw_text=payload.get("raw_text"),
        )

    async def classify_photo(self, image_url: str) -> PhotoCategory:
        messages: list[dict[str, Any]] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Classify this coffee shop photo. "
                            "If both MENU and VIBE apply, choose MENU."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]
        response = await self._client.chat.completions.create(
            model=self._classify_model,
            messages=cast("list[Any]", messages),
            tools=cast("Any", [_wrap_schema_for_openai(CLASSIFY_PHOTO_SCHEMA)]),
            tool_choice=cast(
                "Any",
                {"type": "function", "function": {"name": "classify_photo"}},
            ),
            max_completion_tokens=128,
        )
        payload = _extract_tool_input(response, "classify_photo")
        return PhotoCategory(payload["category"])

    async def summarize_reviews(
        self,
        google_reviews: list[str],
        checkin_texts: list[str],
    ) -> ReviewSummaryResult:
        parts: list[str] = []
        if google_reviews:
            lines = "\n".join(f"[{i + 1}] {r}" for i, r in enumerate(google_reviews))
            parts.append(f"Google 評論：\n{lines}")
        if checkin_texts:
            lines = "\n".join(f"[{i + 1}] {t}" for i, t in enumerate(checkin_texts))
            parts.append(f"社群筆記（請優先參考）：\n{lines}")

        user_content = "\n\n".join(parts)
        wrapped = _wrap_schema_for_openai(SUMMARIZE_REVIEWS_TOOL_SCHEMA)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": _SUMMARIZE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]
        response = await self._client.chat.completions.create(
            model=self._classify_model,
            messages=cast("list[Any]", messages),
            tools=cast("Any", [wrapped]),
            tool_choice=cast(
                "Any",
                {"type": "function", "function": {"name": "summarize_reviews"}},
            ),
            max_completion_tokens=512,
        )
        tool_input = _extract_tool_input(response, "summarize_reviews")
        return ReviewSummaryResult(
            summary_zh_tw=tool_input["summary_zh_tw"],
            review_topics=[
                ReviewTopic(topic=t["topic"], count=t["count"])
                for t in tool_input.get("review_topics", [])
            ],
        )

    async def assign_tarot(self, shop: ShopEnrichmentInput) -> TarotEnrichmentResult:
        lines = [f"Shop: {shop.name}"]
        if shop.description:
            lines.append(f"Description: {shop.description}")
        if shop.reviews:
            lines.append(f"Sample reviews: {'; '.join(shop.reviews[:5])}")
        lines.append("")
        lines.append("Title-to-tag reference (pick the best match):")
        for tarot_title, tags in TITLE_TO_TAGS.items():
            lines.append(f"  {tarot_title}: {', '.join(tags)}")
        prompt = "\n".join(lines)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": TAROT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        response = await self._client.chat.completions.create(
            model=self._nano_model,
            messages=cast("list[Any]", messages),
            tools=cast("Any", [_wrap_schema_for_openai(ASSIGN_TAROT_SCHEMA)]),
            tool_choice=cast(
                "Any",
                {"type": "function", "function": {"name": "assign_tarot"}},
            ),
            max_completion_tokens=256,
        )
        payload = _extract_tool_input(response, "assign_tarot")
        title: str | None = payload.get("tarot_title")
        if title not in TAROT_TITLES:
            title = None
        return TarotEnrichmentResult(
            tarot_title=title,
            flavor_text=payload.get("flavor_text", ""),
        )
