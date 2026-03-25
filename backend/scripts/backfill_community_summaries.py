"""Enqueue SUMMARIZE_REVIEWS jobs for all live shops to generate community summaries.

Run after deploying the community_summary column and summarize_reviews handler
to populate summaries for all 164 existing live shops.

Usage (run from backend/):
    uv run python scripts/backfill_community_summaries.py [--dry-run]

Cost: ~$0.49 (Claude Haiku, ~$0.003/shop × 164 shops)
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import get_service_role_client
from models.types import JobStatus, JobType
from workers.queue import JobQueue


async def main(dry_run: bool, queue: JobQueue | None = None) -> None:
    """Main entrypoint. Accept an optional queue for testability."""
    print("\n=== Backfill community summaries for live shops ===\n")

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

    # Deduplicate: skip shops that already have a pending SUMMARIZE_REVIEWS job
    existing = (
        db.table("job_queue")
        .select("payload")
        .eq("job_type", JobType.SUMMARIZE_REVIEWS.value)
        .eq("status", JobStatus.PENDING.value)
        .execute()
        .data
        or []
    )
    already_queued = {row["payload"].get("shop_id") for row in existing}
    to_enqueue = [r for r in rows if r["id"] not in already_queued]

    if len(to_enqueue) < len(rows):
        skipped = len(rows) - len(to_enqueue)
        print(f"Skipped {skipped} shop(s) — SUMMARIZE_REVIEWS job already pending.")

    if not to_enqueue:
        print("All shops already have pending jobs. Nothing to enqueue.")
        return

    _queue = queue or JobQueue(db)
    await _queue.enqueue_batch(
        job_type=JobType.SUMMARIZE_REVIEWS,
        payloads=[{"shop_id": r["id"]} for r in to_enqueue],
        priority=2,
    )

    print(f"Enqueued {len(to_enqueue)} SUMMARIZE_REVIEWS jobs.")
    print("Monitor worker logs: tail -f logs or Railway log stream.")
    print("Cost estimate: ~${:.2f}".format(len(to_enqueue) * 0.003))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List shops without enqueueing")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))
