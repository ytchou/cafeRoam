"""Re-enrich shops that have English-only descriptions.

Finds all shops where description exists but contains no CJK characters,
then runs enrich → embed → publish on each (no scraping — data already exists).

Usage (run from backend/):
    uv run python scripts/reenrich_english_only.py [--dry-run] [--concurrency 3]
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import get_service_role_client
from models.types import TaxonomyTag
from providers.embeddings import get_embeddings_provider
from providers.llm import get_llm_provider
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.publish_shop import handle_publish_shop
from workers.queue import JobQueue


def _fmt(s: float) -> str:
    return f"{int(s // 60)}m{int(s % 60):02d}s" if s >= 60 else f"{s:5.1f}s"


def find_english_only_shops(db) -> list[dict]:
    rows = db.table("shops").select("id, name, description").execute().data
    return [
        r for r in rows
        if r.get("description")
        and not any("\u4e00" <= c <= "\u9fff" for c in r["description"])
    ]


async def reenrich_shop(
    shop: dict,
    idx: int,
    total: int,
    db,
    queue: JobQueue,
    sem: asyncio.Semaphore,
    taxonomy: list[TaxonomyTag],
) -> dict:
    name = shop["name"]
    result: dict = {"shop_id": shop["id"], "name": name}

    async with sem:
        t0 = time.monotonic()
        print(f"  [{idx:>2}/{total}] {name:<40} enriching…", flush=True)
        try:
            await handle_enrich_shop(
                payload={"shop_id": shop["id"]},
                db=db,
                llm=get_llm_provider(taxonomy=taxonomy),
                queue=queue,
            )
            await handle_generate_embedding(
                payload={"shop_id": shop["id"]},
                db=db,
                embeddings=get_embeddings_provider(),
                queue=queue,
            )
            await handle_publish_shop(
                payload={"shop_id": shop["id"]},
                db=db,
            )
            elapsed = _fmt(time.monotonic() - t0)
            print(f"  [{idx:>2}/{total}] {name:<40} done  ({elapsed})", flush=True)
            result["status"] = "ok"
        except Exception as e:
            elapsed = _fmt(time.monotonic() - t0)
            print(f"  [{idx:>2}/{total}] {name:<40} ERROR: {e!s:.60}  ({elapsed})", flush=True)
            result["status"] = "error"
            result["error"] = str(e)

    return result


async def main(dry_run: bool, concurrency: int) -> None:
    print("\n=== Re-enrich English-only shop descriptions ===\n")

    db = get_service_role_client()
    shops = find_english_only_shops(db)

    if not shops:
        print("No English-only descriptions found. Nothing to do.")
        return

    print(f"Found {len(shops)} shops with English-only descriptions:\n")
    for i, s in enumerate(shops, 1):
        preview = s["description"][:80].replace("\n", " ")
        print(f"  {i:>2}. {s['name']:<35}  \"{preview}...\"")

    if dry_run:
        print("\nDry-run — stopping here.")
        return

    print(f"\nStarting re-enrichment (concurrency={concurrency})…\n")

    taxonomy = [TaxonomyTag(**t) for t in db.table("taxonomy_tags").select("*").execute().data]
    queue = JobQueue(db)
    sem = asyncio.Semaphore(concurrency)
    t_start = time.monotonic()

    tasks = [
        reenrich_shop(shop, i + 1, len(shops), db, queue, sem, taxonomy)
        for i, shop in enumerate(shops)
    ]
    results = await asyncio.gather(*tasks)

    ok = [r for r in results if r.get("status") == "ok"]
    errors = [r for r in results if r.get("status") == "error"]

    print(f"\n{'─' * 55}")
    print(f"  Done in {_fmt(time.monotonic() - t_start)}")
    print(f"  Success: {len(ok)}  |  Errors: {len(errors)}")
    if errors:
        print("\n  Errors:")
        for r in errors:
            print(f"    ✗ {r['name']}  —  {r.get('error', '')[:70]}")
    print(f"{'─' * 55}\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="List shops without re-enriching")
    parser.add_argument("--concurrency", type=int, default=3, help="Parallel workers (default 3)")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, concurrency=args.concurrency))
