"""Enqueue GENERATE_EMBEDDING jobs for all live shops with qualifying check-in text.

Run after deploying the check-in review embedding changes to rebuild
embeddings with community text included.

Usage (run from backend/):
    uv run python scripts/reembed_reviewed_shops.py [--dry-run]

Cost: ~$0.01 (OpenAI text-embedding-3-small, ~1300 tokens × N shops)
"""

import asyncio
import sys
from pathlib import Path
from typing import Any, cast

sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import get_service_role_client
from models.types import CHECKIN_MIN_TEXT_LENGTH, JobStatus, JobType
from workers.queue import JobQueue


async def main(
    dry_run: bool,
    db: Any | None = None,
    queue: JobQueue | None = None,
) -> None:
    """Main entrypoint. Accept optional db/queue for testability."""
    print("\n=== Re-embed shops with community check-in text ===\n")

    if db is None:
        db = get_service_role_client()

    # Find live shops with qualifying check-in text
    response = db.rpc(
        "find_shops_with_checkin_text",
        {"p_min_text_length": CHECKIN_MIN_TEXT_LENGTH},
    ).execute()
    rows = cast("list[dict[str, Any]]", response.data or [])

    if not rows:
        print("No shops with qualifying check-in text found. Nothing to do.")
        return

    print(f"Found {len(rows)} shops with check-in text.\n")

    if dry_run:
        for r in rows:
            print(f"  {r['name']}")
        print("\nDry-run — no jobs enqueued.")
        return

    # Deduplicate against pending or in-progress (claimed) jobs to prevent concurrent
    # embedding runs for the same shop, which would race on the embedding
    # + last_embedded_at columns.
    existing = (
        db.table("job_queue")
        .select("payload")
        .eq("job_type", JobType.GENERATE_EMBEDDING.value)
        .in_("status", [JobStatus.PENDING.value, JobStatus.CLAIMED.value])
        .limit(10000)
        .execute()
        .data
        or []
    )
    already_queued = {row["payload"].get("shop_id") for row in existing}
    to_enqueue = [r for r in rows if r["id"] not in already_queued]

    if len(to_enqueue) < len(rows):
        skipped = len(rows) - len(to_enqueue)
        print(f"Skipped {skipped} shop(s) — GENERATE_EMBEDDING job already pending or in progress.")

    if not to_enqueue:
        print("All shops already have pending jobs. Nothing to enqueue.")
        return

    _queue = queue or JobQueue(db)
    await _queue.enqueue_batch(
        job_type=JobType.GENERATE_EMBEDDING,
        payloads=[{"shop_id": r["id"]} for r in to_enqueue],
        priority=3,
    )

    print(f"Enqueued {len(to_enqueue)} GENERATE_EMBEDDING jobs.")
    print("All shops remain 'live' throughout — no search downtime.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List shops without enqueueing")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))
