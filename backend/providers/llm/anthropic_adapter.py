import logging
import re
import unicodedata

from anthropic import AsyncAnthropic
from anthropic.types import Message

from core.search_vocabulary import ITEM_TERMS, SPECIALTY_TERMS
from core.tarot_vocabulary import TAROT_TITLES, TITLE_TO_TAGS
from models.types import (
    EnrichmentResult,
    MenuExtractionResult,
    PhotoCategory,
    ReviewSummaryResult,
    ReviewTopic,
    ShopEnrichmentInput,
    ShopModeScores,
    TarotEnrichmentResult,
    TaxonomyTag,
)
from providers.api_usage_logger import log_api_usage
from providers.cost import compute_llm_cost
from providers.llm._tool_schemas import (
    ASSIGN_TAROT_SCHEMA as ASSIGN_TAROT_TOOL,
)
from providers.llm._tool_schemas import (
    CLASSIFY_PHOTO_SCHEMA as CLASSIFY_PHOTO_TOOL,
)
from providers.llm._tool_schemas import (
    CLASSIFY_SHOP_SCHEMA as CLASSIFY_SHOP_TOOL,
)
from providers.llm._tool_schemas import (
    EXTRACT_MENU_SCHEMA as EXTRACT_MENU_TOOL,
)
from providers.llm._tool_schemas import SUMMARIZE_REVIEWS_TOOL_SCHEMA

logger = logging.getLogger(__name__)

_MULTI_SPACE = re.compile(r"\s+")
_TRAILING_PUNCT = re.compile(r"[?!.]+$")


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.lower().strip()
    text = _MULTI_SPACE.sub(" ", text)
    text = _TRAILING_PUNCT.sub("", text)
    return text.strip()


_ITEM_VOCAB: dict[str, str] = {_normalize(t): t for t in ITEM_TERMS}
_SPECIALTY_VOCAB: dict[str, str] = {_normalize(t): t for t in SPECIALTY_TERMS}


def _to_vocab_term(raw: str, vocab: dict[str, str]) -> str | None:
    norm = _normalize(raw)
    return vocab.get(norm) or next((canonical for n, canonical in vocab.items() if n in norm), None)


_MENU_VOCAB_REF = ", ".join(ITEM_TERMS)
_SPECIALTY_VOCAB_REF = ", ".join(SPECIALTY_TERMS)

SUMMARIZE_REVIEWS_SYSTEM_PROMPT = (
    "You summarize coffee shop visitor reviews into a concise community snapshot. "
    "You MUST write entirely in Traditional Chinese (繁體中文). Even if the source "
    "reviews are in English or mixed languages, your output must be in Traditional Chinese. "
    "Focus on: popular drinks/food, atmosphere, work-suitability, "
    "and standout qualities. Output 2-4 sentences, max 200 characters total. "
    "Do NOT use bullet points or lists — write flowing prose."
)

_SUMMARIZE_SYSTEM_PROMPT = (
    "你是台灣咖啡廳資料整理助手。根據提供的評論資料，以繁體中文撰寫咖啡廳摘要，並提取常見主題標籤。\n\n"
    "摘要規則：\n"
    "- 2–4 句話，最多 200 字\n"
    "- 著重飲品、食物、氛圍、工作適合度\n"
    "- 若同時有社群筆記與 Google 評論，以社群筆記為主，Google 評論為輔\n"
    "- 語氣自然，不用條列式\n\n"
    "主題標籤規則：\n"
    "- 提取 8–10 個常見主題（如「手沖咖啡」、「安靜工作」、「插座充足」）\n"
    "- 以繁體中文為主，若原文為英文可保留英文詞彙\n"
    "- count 為估計提及次數"
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
    "LANGUAGE REQUIREMENT: Your entire response must be in Traditional Chinese (繁體中文). "
    "This is non-negotiable. Do not use English, Simplified Chinese, or any other language "
    "anywhere in your response — not even partially. If the reviews are in English, "
    "translate and synthesize them into Traditional Chinese.\n\n"
    "Rules:\n"
    "- ONLY select tags from the provided taxonomy list. Never invent new tags.\n"
    "- Assign a confidence score (0.0-1.0) to each tag based on how strongly "
    "the reviews support it.\n"
    "- Write a 2-3 sentence summary in Traditional Chinese (繁體中文) describing the shop's "
    "character — what makes it special, who it's for. If reviews mention specific menu items "
    "(foods, drinks) or coffee origins by name, include them in the summary.\n"
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


def _parse_enrichment_payload(payload: dict, taxonomy_by_id: dict) -> EnrichmentResult:
    raw_tags = payload.get("tags", [])
    valid_tags: list[TaxonomyTag] = []
    tag_confidences: dict[str, float] = {}
    confidences: list[float] = []

    for raw in raw_tags:
        tag_id = raw.get("id", "")
        if tag_id not in taxonomy_by_id:
            logger.warning("Filtering unknown tag: %s", tag_id)
            continue
        confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.0))))
        tag = taxonomy_by_id[tag_id]
        valid_tags.append(tag)
        tag_confidences[tag_id] = confidence
        confidences.append(confidence)

    mode_str = payload.get("mode", "mixed")
    mode_scores = MODE_SCORES.get(mode_str, MODE_SCORES["mixed"])

    overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    raw_highlights = payload.get("menu_highlights") or []
    raw_origins = payload.get("coffee_origins") or []
    menu_highlights = list(
        dict.fromkeys(t for raw in raw_highlights if (t := _to_vocab_term(raw, _ITEM_VOCAB)))
    )
    coffee_origins = list(
        dict.fromkeys(t for raw in raw_origins if (t := _to_vocab_term(raw, _SPECIALTY_VOCAB)))
    )

    return EnrichmentResult(
        tags=valid_tags,
        tag_confidences=tag_confidences,
        summary=payload.get("summary", ""),
        confidence=overall_confidence,
        mode_scores=mode_scores,
        menu_highlights=menu_highlights,
        coffee_origins=coffee_origins,
    )


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
        messages = self._build_enrich_messages(shop)

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=[CLASSIFY_SHOP_TOOL],
            tool_choice={"type": "tool", "name": "classify_shop"},
        )

        usage = response.usage
        log_api_usage(
            provider="anthropic",
            task="enrich_shop",
            model=self._model,
            tokens_input=usage.input_tokens,
            tokens_output=usage.output_tokens,
            tokens_cache_write=getattr(usage, "cache_creation_input_tokens", 0) or 0,
            tokens_cache_read=getattr(usage, "cache_read_input_tokens", 0) or 0,
            cost_usd=compute_llm_cost(
                self._model,
                usage.input_tokens,
                usage.output_tokens,
                getattr(usage, "cache_creation_input_tokens", 0) or 0,
                getattr(usage, "cache_read_input_tokens", 0) or 0,
            ),
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

    async def summarize_reviews(
        self,
        google_reviews: list[str],
        checkin_texts: list[str],
    ) -> ReviewSummaryResult:
        """Summarize Google reviews and community check-in texts into a structured snapshot."""
        parts: list[str] = []
        if google_reviews:
            lines = "\n".join(f"[{i + 1}] {r}" for i, r in enumerate(google_reviews))
            parts.append(f"Google 評論：\n{lines}")
        if checkin_texts:
            lines = "\n".join(f"[{i + 1}] {t}" for i, t in enumerate(checkin_texts))
            parts.append(f"社群筆記（請優先參考）：\n{lines}")

        user_content = "\n\n".join(parts)
        response = await self._client.messages.create(
            model=self._classify_model,
            max_tokens=512,
            system=_SUMMARIZE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
            tools=[SUMMARIZE_REVIEWS_TOOL_SCHEMA],
            tool_choice={"type": "tool", "name": "summarize_reviews"},
        )
        tool_input = self._extract_tool_input(response, "summarize_reviews")
        return ReviewSummaryResult(
            summary_zh_tw=tool_input["summary_zh_tw"],
            review_topics=[
                ReviewTopic(topic=t["topic"], count=t["count"])
                for t in tool_input.get("review_topics", [])
            ],
        )

    def _build_enrich_messages(self, shop: ShopEnrichmentInput) -> list[dict]:
        """Build the messages list for the enrich_shop API call.

        When vibe_photo_urls is non-empty, returns a content list with image blocks
        followed by the text prompt. Otherwise returns a plain string content message.
        """
        text_prompt = self._build_enrich_prompt(shop)

        if not shop.vibe_photo_urls:
            return [{"role": "user", "content": text_prompt}]

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
            content.append({"type": "image", "source": {"type": "url", "url": url}})
        content.append({"type": "text", "text": text_prompt})

        return [{"role": "user", "content": content}]

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
                    f"Confirmed Google Maps features: {feature_list}."
                    " Assign confidence >= 0.9 to tags matching confirmed features."
                )

        return "\n".join(lines)

    @staticmethod
    def _extract_tool_input(response: Message, tool_name: str) -> dict:
        for block in response.content:
            if block.type == "tool_use" and block.name == tool_name:
                return block.input
        raise ValueError(f"No tool_use block with name '{tool_name}' in response")

    def _parse_enrichment(self, tool_input: dict) -> EnrichmentResult:
        return _parse_enrichment_payload(tool_input, self._taxonomy_by_id)
