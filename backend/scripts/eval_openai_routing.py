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
    """Run the eval against the given shop IDs.

    Not yet implemented — fill in during eval run.
    """
    raise NotImplementedError("Fill in during eval run")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Eval gate for OpenAI hybrid routing (DEV-304)"
    )
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

    results = asyncio.run(run_eval(shop_ids))
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
