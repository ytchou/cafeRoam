"""Enqueue SUMMARIZE_REVIEWS for live shops missing review_topics.

Run after deploying the review_topics column and summarize_reviews handler
to populate review topics for all existing live shops.

Usage (run from backend/):
    uv run python scripts/backfill_review_topics.py
    uv run python scripts/backfill_review_topics.py --dry-run

Cost: ~$0.001/shop (Claude Haiku via hybrid routing)
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import get_service_role_client
from models.types import JobStatus, JobType
from workers.queue import JobQueue

COST_PER_SHOP_USD = 0.001


async def main(dry_run: bool, queue: JobQueue | None = None) -> None:
    """Main entrypoint. Accept an optional queue for testability."""
    print("\n=== Backfill review_topics for live shops ===\n")

    db = get_service_role_client()
    rows = (
        db.table("shops")
        .select("id, name")
        .eq("processing_status", "live")
        .is_("review_topics", "null")
        .execute()
        .data
    )

    if not rows:
        print("No live shops without review_topics. Nothing to do.")
        return

    print(f"Found {len(rows)} live shops missing review_topics.\n")

    if dry_run:
        for r in rows:
            print(f"  {r['name']}")
        print(f"\nEstimated cost: ~${len(rows) * COST_PER_SHOP_USD:.2f} USD")
        print("\nDry-run — no jobs enqueued.")
        return

    # Deduplicate: skip shops that already have a pending or claimed SUMMARIZE_REVIEWS job
    batch_shop_ids = [r["id"] for r in rows]
    existing = (
        db.table("job_queue")
        .select("payload")
        .eq("job_type", JobType.SUMMARIZE_REVIEWS.value)
        .in_("status", [JobStatus.PENDING.value, JobStatus.CLAIMED.value])
        .in_("payload->>shop_id", batch_shop_ids)
        .execute()
        .data
        or []
    )
    already_queued = {row["payload"].get("shop_id") for row in existing}
    to_enqueue = [r for r in rows if r["id"] not in already_queued]

    if len(to_enqueue) < len(rows):
        skipped = len(rows) - len(to_enqueue)
        print(f"Skipped {skipped} shop(s) — SUMMARIZE_REVIEWS job already in flight.")

    if not to_enqueue:
        print("All shops already have pending jobs. Nothing to enqueue.")
        return

    print(f"Will enqueue {len(to_enqueue)} shops.")
    print(f"Estimated cost: ~${len(to_enqueue) * COST_PER_SHOP_USD:.2f} USD\n")

    _queue = queue or JobQueue(db)
    await _queue.enqueue_batch(
        job_type=JobType.SUMMARIZE_REVIEWS,
        payloads=[{"shop_id": r["id"]} for r in to_enqueue],
        priority=2,
    )

    print(f"Enqueued {len(to_enqueue)} SUMMARIZE_REVIEWS jobs.")
    print("Monitor worker logs: tail -f logs or Railway log stream.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List shops without enqueueing")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))
