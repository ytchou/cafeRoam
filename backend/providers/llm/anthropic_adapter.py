import logging

from anthropic import AsyncAnthropic
from anthropic.types import Message

from core.tarot_vocabulary import TAROT_TITLES, TITLE_TO_TAGS
from models.types import (
    EnrichmentResult,
    MenuExtractionResult,
    PhotoCategory,
    ShopEnrichmentInput,
    ShopModeScores,
    TarotEnrichmentResult,
    TaxonomyTag,
)

logger = logging.getLogger(__name__)

CLASSIFY_SHOP_TOOL = {
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
        },
        "required": ["tags", "summary", "mode"],
    },
}

EXTRACT_MENU_TOOL = {
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

ASSIGN_TAROT_TOOL = {
    "name": "assign_tarot",
    "description": "Assign a mystical tarot archetype title and flavor text to a coffee shop",
    "input_schema": {
        "type": "object",
        "properties": {
            "tarot_title": {
                "type": "string",
                "enum": TAROT_TITLES,
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

CLASSIFY_PHOTO_TOOL = {
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

SUMMARIZE_REVIEWS_SYSTEM_PROMPT = (
    "You summarize coffee shop visitor reviews into a concise community snapshot. "
    "You MUST write entirely in Traditional Chinese (繁體中文). Even if the source "
    "reviews are in English or mixed languages, your output must be in Traditional Chinese. "
    "Focus on: popular drinks/food, atmosphere, work-suitability, "
    "and standout qualities. Output 2-4 sentences, max 200 characters total. "
    "Do NOT use bullet points or lists — write flowing prose."
)

TAROT_SYSTEM_PROMPT = (
    "You are a mystical coffee guide who assigns tarot archetype names to cafes. "
    "Based on the shop's characteristics and reviews, pick the single best-fitting "
    "title from the provided list. Write a one-line flavor text — evocative, "
    "mysterious, and no longer than 80 characters."
)

SYSTEM_PROMPT = (
    "You are an expert on Taiwan's independent coffee shop scene. "
    "You classify coffee shops based on their Google Maps reviews "
    "using a predefined taxonomy.\n\n"
    "Rules:\n"
    "- ONLY select tags from the provided taxonomy list. Never invent new tags.\n"
    "- Assign a confidence score (0.0-1.0) to each tag based on how strongly "
    "the reviews support it.\n"
    "- Write a 2-3 sentence summary describing the shop's character — "
    "what makes it special, who it's for. If reviews mention specific menu items "
    "(foods, drinks) or coffee origins by name, include them in the summary. "
    "You MUST write the summary in Traditional Chinese (繁體中文). "
    "Even if the reviews are in English, your summary must be in Traditional Chinese.\n"
    "- Select the 3-5 most informative review excerpts that would help someone "
    "decide whether to visit.\n"
    "- Classify the primary mode: work (focused tasks), rest (relaxation/reading), "
    "social (meeting people), or mixed."
)

MODE_SCORES: dict[str, ShopModeScores] = {
    "work": ShopModeScores(work=1.0, rest=0.0, social=0.0),
    "rest": ShopModeScores(work=0.0, rest=1.0, social=0.0),
    "social": ShopModeScores(work=0.0, rest=0.0, social=1.0),
    "mixed": ShopModeScores(work=0.5, rest=0.5, social=0.5),
}


class AnthropicLLMAdapter:
    def __init__(
        self,
        api_key: str,
        model: str,
        taxonomy: list[TaxonomyTag],
        classify_model: str,
    ):
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model
        self._classify_model = classify_model
        self._taxonomy = taxonomy
        self._taxonomy_by_id: dict[str, TaxonomyTag] = {tag.id: tag for tag in taxonomy}

    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult:
        user_prompt = self._build_enrich_prompt(shop)

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
            tools=[CLASSIFY_SHOP_TOOL],
            tool_choice={"type": "tool", "name": "classify_shop"},
        )

        tool_input = self._extract_tool_input(response, "classify_shop")
        return self._parse_enrichment(tool_input)

    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "url", "url": image_url},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract all menu items from this coffee shop menu photo. "
                                "Return structured data with item names, prices (as numbers), "
                                "descriptions, and categories where visible."
                            ),
                        },
                    ],
                }
            ],
            tools=[EXTRACT_MENU_TOOL],
            tool_choice={"type": "tool", "name": "extract_menu"},
        )

        tool_input = self._extract_tool_input(response, "extract_menu")
        return MenuExtractionResult(
            items=tool_input.get("items", []),
            raw_text=tool_input.get("raw_text"),
        )

    async def assign_tarot(self, shop: ShopEnrichmentInput) -> TarotEnrichmentResult:
        """Assign a tarot title and flavor text to a shop."""
        lines = [f"Shop: {shop.name}"]
        if shop.description:
            lines.append(f"Description: {shop.description}")
        if shop.reviews:
            lines.append(f"Sample reviews: {'; '.join(shop.reviews[:5])}")
        lines.append("")
        lines.append("Title-to-tag reference (pick the best match):")
        for title, tags in TITLE_TO_TAGS.items():
            lines.append(f"  {title}: {', '.join(tags)}")

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=256,
            system=TAROT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": "\n".join(lines)}],
            tools=[ASSIGN_TAROT_TOOL],
            tool_choice={"type": "tool", "name": "assign_tarot"},
        )

        tool_input = self._extract_tool_input(response, "assign_tarot")
        title = tool_input.get("tarot_title", "")
        flavor = tool_input.get("flavor_text", "")
        validated_title = title if title in TAROT_TITLES else None

        return TarotEnrichmentResult(tarot_title=validated_title, flavor_text=flavor)

    async def classify_photo(self, image_url: str) -> PhotoCategory:
        response = await self._client.messages.create(
            model=self._classify_model,
            max_tokens=128,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "url", "url": image_url},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Classify this coffee shop photo. "
                                "If both MENU and VIBE apply, choose MENU."
                            ),
                        },
                    ],
                }
            ],
            tools=[CLASSIFY_PHOTO_TOOL],
            tool_choice={"type": "tool", "name": "classify_photo"},
        )

        tool_input = self._extract_tool_input(response, "classify_photo")
        raw_category = tool_input.get("category")
        if not raw_category:
            raise ValueError(f"classify_photo tool response missing 'category' key: {tool_input!r}")
        return PhotoCategory(raw_category)

    async def summarize_reviews(self, texts: list[str]) -> str:
        """Summarize community check-in texts into a concise thematic snapshot."""
        numbered = "\n".join(f"[{i}] {t}" for i, t in enumerate(texts, 1))
        user_prompt = (
            f"Summarize these {len(texts)} visitor reviews into a community snapshot:\n\n{numbered}"
        )

        response = await self._client.messages.create(
            model=self._classify_model,
            max_tokens=512,
            system=SUMMARIZE_REVIEWS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        for block in response.content:
            if block.type == "text":
                return block.text.strip()
        raise ValueError("No text block in summarize_reviews response")

    def _build_enrich_prompt(self, shop: ShopEnrichmentInput) -> str:
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
        for tag in self._taxonomy:
            lines.append(f"  {tag.id} ({tag.dimension}) — {tag.label} / {tag.label_zh}")

        return "\n".join(lines)

    @staticmethod
    def _extract_tool_input(response: Message, tool_name: str) -> dict:
        for block in response.content:
            if block.type == "tool_use" and block.name == tool_name:
                return block.input
        raise ValueError(f"No tool_use block with name '{tool_name}' in response")

    def _parse_enrichment(self, tool_input: dict) -> EnrichmentResult:
        raw_tags = tool_input.get("tags", [])
        valid_tags: list[TaxonomyTag] = []
        tag_confidences: dict[str, float] = {}
        confidences: list[float] = []

        for raw in raw_tags:
            tag_id = raw.get("id", "")
            if tag_id not in self._taxonomy_by_id:
                logger.warning("Filtering unknown tag: %s", tag_id)
                continue
            confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.0))))
            tag = self._taxonomy_by_id[tag_id]
            valid_tags.append(tag)
            tag_confidences[tag_id] = confidence
            confidences.append(confidence)

        mode_str = tool_input.get("mode", "mixed")
        mode_scores = MODE_SCORES.get(mode_str, MODE_SCORES["mixed"])

        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return EnrichmentResult(
            tags=valid_tags,
            tag_confidences=tag_confidences,
            summary=tool_input.get("summary", ""),
            confidence=overall_confidence,
            mode_scores=mode_scores,
            menu_highlights=tool_input.get("menu_highlights", []),
            coffee_origins=tool_input.get("coffee_origins", []),
        )
