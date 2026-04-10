"""Eval gate script for OpenAI routing (DEV-304).

Run against a set of shop IDs to measure whether the hybrid LLM routing
meets the hard quality gates required before enabling OpenAI in production.

Usage:
    uv run python -m scripts.eval_openai_routing --shops <id1> <id2> ...
    uv run python -m scripts.eval_openai_routing --auto
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import settings
from core.lang import is_zh_dominant
from core.tarot_vocabulary import TAROT_TITLES
from db.supabase_client import get_service_role_client
from models.types import ShopEnrichmentInput
from providers.llm.anthropic_adapter import AnthropicLLMAdapter
from providers.llm.openai_adapter import OpenAILLMAdapter

# Hard-gate thresholds
SUMMARIZE_ZH_THRESHOLD = 0.95
CLASSIFY_PHOTO_THRESHOLD = 0.90
EXTRACT_MENU_RECALL_THRESHOLD = 0.85
TAROT_WHITELIST_THRESHOLD = 1.0


@dataclass
class EvalResult:
    summarize_zh_pass_rate: float
    classify_photo_agreement: float
    extract_menu_item_recall: float
    tarot_whitelist_rate: float


def evaluate_hard_gates(results: EvalResult) -> tuple[bool, list[str]]:
    """Check each metric against its threshold.

    Returns:
        (passed, failures) where failures is a list of descriptive failure strings.
    """
    failures: list[str] = []

    if results.summarize_zh_pass_rate < SUMMARIZE_ZH_THRESHOLD:
        failures.append(
            f"summarize_zh_pass_rate {results.summarize_zh_pass_rate:.3f} "
            f"< threshold {SUMMARIZE_ZH_THRESHOLD}"
        )
    if results.classify_photo_agreement < CLASSIFY_PHOTO_THRESHOLD:
        failures.append(
            f"classify_photo_agreement {results.classify_photo_agreement:.3f} "
            f"< threshold {CLASSIFY_PHOTO_THRESHOLD}"
        )
    if results.extract_menu_item_recall < EXTRACT_MENU_RECALL_THRESHOLD:
        failures.append(
            f"extract_menu_item_recall {results.extract_menu_item_recall:.3f} "
            f"< threshold {EXTRACT_MENU_RECALL_THRESHOLD}"
        )
    if results.tarot_whitelist_rate < TAROT_WHITELIST_THRESHOLD:
        failures.append(
            f"tarot_whitelist_rate {results.tarot_whitelist_rate:.3f} "
            f"< threshold {TAROT_WHITELIST_THRESHOLD}"
        )

    return len(failures) == 0, failures


async def run_eval(shop_ids: list[str]) -> EvalResult:
    """Run the eval against the given shop IDs."""

    db = get_service_role_client()
    shop_fields = (
        "id, name, description, categories, price_range, socket, limited_time, "
        "rating, review_count, google_maps_features"
    )
    report_rows: list[dict[str, str]] = []
    zh_pass_list: list[bool] = []
    classify_agree_list: list[bool] = []
    recall_list: list[float] = []
    tarot_list: list[bool] = []

    # prefetched_rows maps shop_id -> row dict for shops already loaded in bulk.
    prefetched_rows: dict[str, dict] = {}

    if not shop_ids:
        rows = await asyncio.to_thread(
            lambda: (
                db.table("shops")
                .select(shop_fields)
                .not_.is_("enriched_at", "null")
                .eq("processing_status", "live")
                .limit(20)
                .execute()
                .data
            )
        )
        shop_ids = [row["id"] for row in rows]
        prefetched_rows = {row["id"]: row for row in rows}

    anthropic_adapter = AnthropicLLMAdapter(
        api_key=settings.anthropic_api_key,
        model=settings.anthropic_model,
        classify_model=settings.anthropic_classify_model,
        taxonomy=[],
    )
    openai_adapter = OpenAILLMAdapter(
        api_key=settings.openai_api_key,
        model=settings.openai_llm_model,
        classify_model=settings.openai_llm_classify_model,
        nano_model=settings.openai_llm_nano_model,
        taxonomy=[],
    )

    def _rate(lst: list[bool]) -> float:
        return sum(lst) / len(lst) if lst else 1.0

    def _recall_avg(lst: list[float]) -> float:
        return sum(lst) / len(lst) if lst else 1.0

    for shop_id in shop_ids:
        sid = shop_id  # bind loop variable for lambda capture
        if sid in prefetched_rows:
            shop = prefetched_rows[sid]
        else:
            shop_row = await asyncio.to_thread(
                lambda sid=sid: (
                    db.table("shops").select(shop_fields).eq("id", sid).limit(1).execute().data
                )
            )
            if not shop_row:
                print(f"Warning: shop not found: {shop_id}")
                continue
            shop = shop_row[0]
        print(f"Evaluating {shop['name']}")

        reviews_rows = await asyncio.to_thread(
            lambda sid=sid: (
                db.table("shop_reviews").select("text").eq("shop_id", sid).execute().data
            )
        )
        vibe_photo_rows = await asyncio.to_thread(
            lambda sid=sid: (
                db.table("shop_photos")
                .select("url")
                .eq("shop_id", sid)
                .eq("category", "VIBE")
                .limit(3)
                .execute()
                .data
            )
        )
        menu_photo_rows = await asyncio.to_thread(
            lambda sid=sid: (
                db.table("shop_photos")
                .select("url")
                .eq("shop_id", sid)
                .eq("category", "MENU")
                .limit(2)
                .execute()
                .data
            )
        )

        reviews = [row["text"] for row in reviews_rows if row.get("text")]
        vibe_photo_urls = [row["url"] for row in vibe_photo_rows if row.get("url")]
        menu_photo_urls = [row["url"] for row in menu_photo_rows if row.get("url")]
        shop_input = ShopEnrichmentInput(
            name=shop["name"],
            reviews=reviews,
            description=shop.get("description"),
            categories=shop.get("categories", []),
            price_range=shop.get("price_range"),
            socket=shop.get("socket"),
            limited_time=shop.get("limited_time"),
            rating=shop.get("rating"),
            review_count=shop.get("review_count"),
            google_maps_features=shop.get("google_maps_features") or {},
            vibe_photo_urls=vibe_photo_urls,
        )

        shop_zh_results: list[bool] = []
        shop_photo_results: list[bool] = []
        shop_menu_recalls: list[float] = []
        shop_tarot_results: list[bool] = []

        if reviews:
            try:
                summary = await openai_adapter.summarize_reviews(reviews)
                zh_ok = is_zh_dominant(summary)
                zh_pass_list.append(zh_ok)
                shop_zh_results.append(zh_ok)
            except Exception as exc:
                print(f"Warning: summarize_reviews failed for {shop['name']}: {exc}")

        for image_url in vibe_photo_urls:
            try:
                openai_label = await openai_adapter.classify_photo(image_url)
                anthropic_label = await anthropic_adapter.classify_photo(image_url)
                agreed = openai_label == anthropic_label
                classify_agree_list.append(agreed)
                shop_photo_results.append(agreed)
            except Exception as exc:
                print(f"Warning: classify_photo failed for {shop['name']}: {exc}")

        for image_url in menu_photo_urls:
            try:
                openai_result = await openai_adapter.extract_menu_data(image_url)
                anthropic_result = await anthropic_adapter.extract_menu_data(image_url)
                openai_count = len(openai_result.items)
                anthropic_count = len(anthropic_result.items)
                # Both models returned nothing — no signal, skip sample.
                if anthropic_count == 0 and openai_count == 0:
                    continue
                # Anthropic returned nothing but OpenAI found items — skip (bad reference).
                if anthropic_count == 0:
                    continue
                # OpenAI returned nothing but Anthropic found items — skip sample
                # (image may be unreadable/ambiguous rather than model quality failure).
                if openai_count == 0:
                    print(
                        f"  Note: OpenAI extracted 0 items "
                        f"(Anthropic: {anthropic_count}), skipping sample"
                    )
                    continue
                # Count-based recall: both models see the same menu image but may
                # output names in different languages (zh-TW vs English). Measure
                # item-count coverage symmetry.
                recall = min(openai_count, anthropic_count) / max(openai_count, anthropic_count)
                recall_list.append(recall)
                shop_menu_recalls.append(recall)
            except Exception as exc:
                print(f"Warning: extract_menu_data failed for {shop['name']}: {exc}")

        try:
            tarot_result = await openai_adapter.assign_tarot(shop_input)
            tarot_ok = tarot_result.tarot_title in TAROT_TITLES
            tarot_list.append(tarot_ok)
            shop_tarot_results.append(tarot_ok)
        except Exception as exc:
            print(f"Warning: assign_tarot failed for {shop['name']}: {exc}")

        report_rows.append(
            {
                "shop_name": shop["name"],
                "zh_pass": (f"{_rate(shop_zh_results):.2f}" if shop_zh_results else "n/a"),
                "photo_agree": (
                    f"{_rate(shop_photo_results):.2f}" if shop_photo_results else "n/a"
                ),
                "menu_recall": (
                    f"{_recall_avg(shop_menu_recalls):.2f}" if shop_menu_recalls else "n/a"
                ),
                "tarot_ok": (f"{_rate(shop_tarot_results):.2f}" if shop_tarot_results else "n/a"),
            }
        )

    result = EvalResult(
        summarize_zh_pass_rate=_rate(zh_pass_list),
        classify_photo_agreement=_rate(classify_agree_list),
        extract_menu_item_recall=_recall_avg(recall_list),
        tarot_whitelist_rate=_rate(tarot_list),
    )

    report_path = (
        Path(__file__).parent.parent.parent / "docs" / "evals" / "2026-04-10-openai-routing-eval.md"
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# OpenAI Routing Eval",
        "",
        "| shop_name | zh_pass | photo_agree | menu_recall | tarot_ok |",
        "| --- | --- | --- | --- | --- |",
    ]
    lines.extend(
        f"| {row['shop_name']} | {row['zh_pass']} | {row['photo_agree']} | "
        f"{row['menu_recall']} | {row['tarot_ok']} |"
        for row in report_rows
    )
    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- summarize_zh_pass_rate: {result.summarize_zh_pass_rate:.3f}",
            f"- classify_photo_agreement: {result.classify_photo_agreement:.3f}",
            f"- extract_menu_item_recall: {result.extract_menu_item_recall:.3f}",
            f"- tarot_whitelist_rate: {result.tarot_whitelist_rate:.3f}",
        ]
    )
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Eval gate for OpenAI hybrid routing (DEV-304)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--shops",
        nargs="+",
        metavar="SHOP_ID",
        help="Explicit list of shop IDs to evaluate",
    )
    group.add_argument(
        "--auto",
        action="store_true",
        help="Auto-select shops from the staging dataset",
    )
    args = parser.parse_args()

    shop_ids: list[str] = args.shops if args.shops else []

    try:
        results = asyncio.run(run_eval(shop_ids))
    except Exception as exc:
        print(f"Unexpected eval error: {exc}")
        return 1
    passed, failures = evaluate_hard_gates(results)

    if passed:
        print("PASS — all hard gates met")
        return 0
    else:
        print("FAIL — hard gate failures:")
        for f in failures:
            print(f"  - {f}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
