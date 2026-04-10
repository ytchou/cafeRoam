"""OpenAI LLM adapter — mirrors AnthropicLLMAdapter's protocol shape.

Tool schemas use Anthropic's envelope (name, description, input_schema) as canonical form.
This adapter rewraps them into OpenAI's function_calling envelope at call time.
"""
import json

from models.types import (
    EnrichmentResult,
    MenuExtractionResult,
    PhotoCategory,
    ShopEnrichmentInput,
    TarotEnrichmentResult,
    TaxonomyTag,
)
from providers.llm._tool_schemas import (
    ASSIGN_TAROT_SCHEMA,
    CLASSIFY_PHOTO_SCHEMA,
    CLASSIFY_SHOP_SCHEMA,
    EXTRACT_MENU_SCHEMA,
)
from providers.llm.anthropic_adapter import (
    SUMMARIZE_REVIEWS_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    TAROT_SYSTEM_PROMPT,
    _parse_enrichment_payload,
)


def _wrap_schema_for_openai(schema: dict) -> dict:
    """Convert Anthropic-style schema envelope to OpenAI function_calling envelope."""
    return {
        "type": "function",
        "function": {
            "name": schema["name"],
            "description": schema["description"],
            "parameters": schema["input_schema"],
        },
    }


def _extract_tool_input(response, expected_name: str) -> dict:
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
        return json.loads(tool_call.function.arguments)
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Failed to parse tool_call arguments as JSON for '{expected_name}': {exc}"
        ) from exc


def _build_enrich_messages(
    shop: ShopEnrichmentInput,
    taxonomy: list,
    menu_vocab_ref: str,
    specialty_vocab_ref: str,
) -> list[dict]:
    """Build OpenAI messages list for enrich_shop."""
    from providers.llm.anthropic_adapter import _MENU_VOCAB_REF, _SPECIALTY_VOCAB_REF
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

    content: list[dict] = [
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

    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult:
        messages = _build_enrich_messages(shop, self._taxonomy, "", "")
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            tools=[_wrap_schema_for_openai(CLASSIFY_SHOP_SCHEMA)],
            tool_choice={"type": "function", "function": {"name": "classify_shop"}},
            max_tokens=2048,
        )
        payload = _extract_tool_input(response, "classify_shop")
        return _parse_enrichment_payload(payload, self._taxonomy_by_id)

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult:
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract all menu items from this image. Return structured JSON.",
                    },
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]
        response = await self._client.chat.completions.create(
            model=self._classify_model,
            messages=messages,
            tools=[_wrap_schema_for_openai(EXTRACT_MENU_SCHEMA)],
            tool_choice={"type": "function", "function": {"name": "extract_menu"}},
            max_tokens=4096,
        )
        payload = _extract_tool_input(response, "extract_menu")
        return MenuExtractionResult(
            items=payload.get("items", []) or [],
            raw_text=payload.get("raw_text"),
        )

    async def classify_photo(self, image_url: str) -> PhotoCategory:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Classify this cafe photo as MENU, VIBE, or SKIP."},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]
        response = await self._client.chat.completions.create(
            model=self._classify_model,
            messages=messages,
            tools=[_wrap_schema_for_openai(CLASSIFY_PHOTO_SCHEMA)],
            tool_choice={"type": "function", "function": {"name": "classify_photo"}},
            max_tokens=128,
        )
        payload = _extract_tool_input(response, "classify_photo")
        return PhotoCategory(payload["category"])

    async def summarize_reviews(self, texts: list[str]) -> str:
        numbered = "\n".join(f"[{i+1}] {t}" for i, t in enumerate(texts))
        messages = [
            {"role": "system", "content": SUMMARIZE_REVIEWS_SYSTEM_PROMPT},
            {"role": "user", "content": numbered},
        ]
        response = await self._client.chat.completions.create(
            model=self._classify_model,
            messages=messages,
            max_tokens=512,
        )
        content = response.choices[0].message.content
        return content or ""

    async def assign_tarot(self, shop: ShopEnrichmentInput) -> TarotEnrichmentResult:
        from core.tarot_vocabulary import TAROT_TITLES, TITLE_TO_TAGS
        lines = [f"Shop: {shop.name}"]
        if shop.description:
            lines.append(f"Description: {shop.description}")
        if shop.reviews:
            lines.append(f"Sample reviews: {'; '.join(shop.reviews[:5])}")
        lines.append("")
        lines.append("Title-to-tag reference (pick the best match):")
        for title, tags in TITLE_TO_TAGS.items():
            lines.append(f"  {title}: {', '.join(tags)}")
        prompt = "\n".join(lines)
        messages = [
            {"role": "system", "content": TAROT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        response = await self._client.chat.completions.create(
            model=self._nano_model,
            messages=messages,
            tools=[_wrap_schema_for_openai(ASSIGN_TAROT_SCHEMA)],
            tool_choice={"type": "function", "function": {"name": "assign_tarot"}},
            max_tokens=256,
        )
        payload = _extract_tool_input(response, "assign_tarot")
        title = payload.get("tarot_title")
        if title not in TAROT_TITLES:
            title = None
        return TarotEnrichmentResult(
            tarot_title=title,
            flavor_text=payload.get("flavor_text", ""),
        )
