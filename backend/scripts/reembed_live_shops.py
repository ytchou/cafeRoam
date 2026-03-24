"""Enqueue GENERATE_EMBEDDING jobs for all live shops to rebuild embeddings with menu items.

Run after deploying the shop_menu_items table and handler changes to rebuild all
164 live shop embeddings with their extracted menu items included.

Usage (run from backend/):
    uv run python scripts/reembed_live_shops.py [--dry-run]

Cost: ~$0.01 (OpenAI text-embedding-3-small, ~200 tokens × 164 shops)
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import get_service_role_client
from models.types import JobStatus, JobType
from workers.queue import JobQueue


async def main(dry_run: bool, queue: JobQueue | None = None) -> None:
    """Main entrypoint. Accept an optional queue for testability (injected in tests,
    created from DB connection when run as a script)."""
    print("\n=== Re-embed live shops with menu item enrichment ===\n")

    db = get_service_role_client()
    rows = db.table("shops").select("id, name").eq("processing_status", "live").execute().data

    if not rows:
        print("No live shops found. Nothing to do.")
        return

    print(f"Found {len(rows)} live shops.\n")

    if dry_run:
        for r in rows:
            print(f"  {r['name']}")
        print("\nDry-run — no jobs enqueued.")
        return

    # Deduplicate: skip shops that already have a pending GENERATE_EMBEDDING job
    existing = (
        db.table("job_queue")
        .select("payload")
        .eq("job_type", JobType.GENERATE_EMBEDDING.value)
        .eq("status", JobStatus.PENDING.value)
        .execute()
        .data
        or []
    )
    already_queued = {row["payload"].get("shop_id") for row in existing}
    to_enqueue = [r for r in rows if r["id"] not in already_queued]

    if len(to_enqueue) < len(rows):
        print(f"Skipped {len(rows) - len(to_enqueue)} shop(s) — GENERATE_EMBEDDING job already pending.")

    if not to_enqueue:
        print("All shops already have pending jobs. Nothing to enqueue.")
        return

    _queue = queue or JobQueue(db)
    for r in to_enqueue:
        await _queue.enqueue(
            job_type=JobType.GENERATE_EMBEDDING,
            payload={"shop_id": r["id"]},
            priority=3,  # lower than user-triggered re-embed (priority=5) — batch background work
        )

    print(f"Enqueued {len(to_enqueue)} GENERATE_EMBEDDING jobs.")
    print("Monitor worker logs: tail -f logs or Railway log stream.")
    print("All shops remain 'live' throughout — no search downtime.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List shops without enqueueing")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))
