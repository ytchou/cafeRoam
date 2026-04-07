"""Scrape Google Maps top-5 results for each query and score with Claude LLM judge.

Designed for slow, human-like scraping to avoid bot detection.
Supports resume: queries already in output file are skipped.

Usage (run from backend/):
    uv run python scripts/scrape_maps_baseline.py
    uv run python scripts/scrape_maps_baseline.py --queries-file scripts/search-queries.json
    uv run python scripts/scrape_maps_baseline.py --output scripts/google-maps-baseline.json
    uv run python scripts/scrape_maps_baseline.py --delay-min 20 --delay-max 45
    uv run python scripts/scrape_maps_baseline.py --headless  # for CI/non-GUI environments
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from playwright.async_api import Page, async_playwright

from core.config import settings

_QUERIES_FILE = Path(__file__).parent / "search-queries.json"
_OUTPUT_FILE = Path(__file__).parent / "google-maps-baseline.json"

# Taipei city center coordinates
_MAPS_URL = "https://www.google.com/maps/search/{query}/@25.0479,121.5171,14z?hl=zh-TW"


async def _accept_cookies(page: Page) -> None:
    """Dismiss cookie/consent dialogs if present."""
    try:
        btn = page.get_by_role("button", name="接受全部").first
        if await btn.is_visible(timeout=3000):
            await btn.click()
            await page.wait_for_timeout(1000)
    except Exception:
        pass
    try:
        btn = page.get_by_role("button", name="Accept all").first
        if await btn.is_visible(timeout=2000):
            await btn.click()
            await page.wait_for_timeout(1000)
    except Exception:
        pass


async def scrape_maps_results(page: Page, query: str) -> list[dict]:
    """Search Google Maps and return top 5 result names."""
    url = _MAPS_URL.format(query=query.replace(" ", "+"))
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await _accept_cookies(page)

    # Wait for result feed to appear
    try:
        await page.wait_for_selector('[role="feed"]', timeout=15000)
    except Exception:
        # Try alternate selector
        await page.wait_for_selector(".Nv2PK", timeout=10000)

    # Small pause to let dynamic content settle
    await page.wait_for_timeout(random.randint(1500, 3000))

    results = []

    # Strategy 1: role="feed" items
    try:
        feed = page.locator('[role="feed"]')
        items = feed.locator(".Nv2PK")
        count = await items.count()
        for i in range(min(count, 5)):
            item = items.nth(i)
            # Try to get the business name from the aria-label or h3
            try:
                name_el = item.locator("a.hfpxzc")
                aria = await name_el.get_attribute("aria-label", timeout=2000)
                if aria:
                    results.append({"rank": len(results) + 1, "name": aria.strip()})
                    continue
            except Exception:
                pass
            try:
                name_el = item.locator(".qBF1Pd")
                text = await name_el.inner_text(timeout=2000)
                if text.strip():
                    results.append({"rank": len(results) + 1, "name": text.strip()})
            except Exception:
                pass
    except Exception:
        pass

    # Strategy 2: fallback — get all place links
    if len(results) < 3:
        try:
            links = page.locator('a[href*="/maps/place/"]')
            count = await links.count()
            seen: set[str] = {r["name"] for r in results}
            for i in range(count):
                if len(results) >= 5:
                    break
                link = links.nth(i)
                aria = await link.get_attribute("aria-label", timeout=1000)
                if aria and aria.strip() and aria.strip() not in seen:
                    results.append({"rank": len(results) + 1, "name": aria.strip()})
                    seen.add(aria.strip())
        except Exception:
            pass

    return results[:5]


def score_results_with_llm(
    client: anthropic.Anthropic,
    query: str,
    category: str,
    expected_traits: list[str],
    results: list[dict],
) -> list[dict]:
    """Use Claude to score each result 1-5 for relevance to the query."""
    if not results:
        return []

    results_text = "\n".join(
        f"{r['rank']}. {r['name']}" for r in results
    )
    traits_text = ", ".join(expected_traits)

    prompt = f"""You are scoring Google Maps search results for relevance to a cafe search query.

Query: "{query}"
Category: {category}
Expected traits: {traits_text}

Top 5 results from Google Maps:
{results_text}

Score each result 1-5 for how relevant it is to the query:
- 5: Perfect match (exactly what the user wants)
- 4: Strong match (clearly relevant, minor gaps)
- 3: Moderate match (somewhat relevant)
- 2: Weak match (tangentially related)
- 1: Irrelevant (wrong type of place or no connection)

Respond with JSON only, no explanation:
{{"scores": [
  {{"rank": 1, "score": <1-5>, "notes": "<one short phrase>"}},
  {{"rank": 2, "score": <1-5>, "notes": "<one short phrase>"}},
  {{"rank": 3, "score": <1-5>, "notes": "<one short phrase>"}},
  {{"rank": 4, "score": <1-5>, "notes": "<one short phrase>"}},
  {{"rank": 5, "score": <1-5>, "notes": "<one short phrase>"}}
]}}"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    parsed = json.loads(raw.strip())
    scores_by_rank = {s["rank"]: s for s in parsed["scores"]}

    scored_results = []
    for r in results:
        s = scores_by_rank.get(r["rank"], {"score": 1, "notes": "not scored"})
        scored_results.append({
            "rank": r["rank"],
            "name": r["name"],
            "relevance_score": s["score"],
            "notes": s["notes"],
        })
    return scored_results


async def scrape_baseline(
    queries_file: Path,
    output_file: Path,
    delay_min: int,
    delay_max: int,
    headless: bool,
) -> None:
    queries = json.loads(queries_file.read_text())
    print(f"Loaded {len(queries)} queries from {queries_file}")

    # Load existing output to support resume
    existing: dict[str, dict] = {}
    if output_file.exists():
        try:
            data = json.loads(output_file.read_text())
            # Only keep entries that have real results (not template placeholders)
            for entry in data:
                first = entry.get("maps_results", [{}])[0]
                if entry.get("maps_results") and first.get("name") != "Example Cafe":
                    existing[entry["id"]] = entry
            print(f"Resuming: {len(existing)} queries already done")
        except Exception:
            pass

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--disable-extensions",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="zh-TW",
        )
        page = await context.new_page()

        results_list: list[dict] = list(existing.values())
        done_ids = set(existing.keys())

        for i, q in enumerate(queries):
            qid = q["id"]
            if qid in done_ids:
                print(f"[{i+1}/{len(queries)}] Skipping {qid} (already done)")
                continue

            print(f"[{i+1}/{len(queries)}] Scraping: {q['query']}")
            try:
                maps_results = await scrape_maps_results(page, q["query"])
                if not maps_results:
                    print(f"  WARNING: No results found for {qid}")
                    maps_results = []

                print(f"  Found {len(maps_results)} results — scoring with Claude...")
                scored = score_results_with_llm(
                    client,
                    query=q["query"],
                    category=q["category"],
                    expected_traits=q.get("expectedTraits", []),
                    results=maps_results,
                )
                avg = round(sum(r["relevance_score"] for r in scored) / max(len(scored), 1), 2)

                entry = {
                    "id": qid,
                    "query": q["query"],
                    "category": q["category"],
                    "maps_results": scored,
                    "maps_avg_score": avg,
                }
                results_list.append(entry)
                done_ids.add(qid)

                # Save after each query (resume-safe)
                output_file.write_text(json.dumps(results_list, ensure_ascii=False, indent=2))
                print(f"  Done — avg score: {avg} — saved to {output_file}")

            except Exception as e:
                print(f"  ERROR on {qid}: {e}")
                print("  Continuing to next query...")

            if i < len(queries) - 1 and qid not in {q["id"] for q in queries[:i]}:
                delay = random.randint(delay_min, delay_max)
                print(f"  Waiting {delay}s before next query...")
                await asyncio.sleep(delay)

        await browser.close()

    print(f"\nDone. {len(results_list)}/{len(queries)} queries scraped.")
    print(f"Output: {output_file}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape Google Maps baseline for search quality validation"
    )
    parser.add_argument("--queries-file", type=Path, default=_QUERIES_FILE)
    parser.add_argument("--output", type=Path, default=_OUTPUT_FILE)
    parser.add_argument("--delay-min", type=int, default=30, help="Min seconds between queries")
    parser.add_argument("--delay-max", type=int, default=60, help="Max seconds between queries")
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser headless (not recommended for Maps)",
    )
    args = parser.parse_args()

    asyncio.run(scrape_baseline(
        queries_file=args.queries_file,
        output_file=args.output,
        delay_min=args.delay_min,
        delay_max=args.delay_max,
        headless=args.headless,
    ))


if __name__ == "__main__":
    main()
