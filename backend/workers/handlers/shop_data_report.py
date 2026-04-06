from typing import Any, cast

import structlog
from supabase import Client

from models.issue_tracker_types import IssueCreateRequest
from providers.issue_tracker.interface import IssueTrackerProvider

logger = structlog.get_logger()


async def handle_shop_data_report(db: Client, issue_tracker: IssueTrackerProvider) -> None:
    """Fetch pending shop_reports and create a single Linear issue as a digest."""
    response = (
        db.table("shop_reports")
        .select("id, shop_id, field, description, shops(name)")
        .eq("status", "pending")
        .order("reported_at")
        .execute()
    )
    reports = cast("list[dict[str, Any]]", response.data)

    if not reports:
        logger.info("No pending shop reports — skipping")
        return

    lines = [f"**{len(reports)} pending shop data report(s):**\n"]
    for report in reports:
        shop_name = report.get("shops", {}).get("name", "Unknown shop")
        field = report.get("field") or "general"
        description = report.get("description", "")
        lines.append(f"- **{shop_name}** ({field}): {description}")

    issue_body = "\n".join(lines)

    try:
        result = await issue_tracker.create_issue(
            IssueCreateRequest(
                title=f"Shop data reports ({len(reports)} pending)",
                description=issue_body,
            )
        )
    except Exception:
        logger.exception("Failed to create Linear issue for shop reports — will retry next run")
        return

    logger.info("Created Linear issue for shop reports", issue_id=result.id, count=len(reports))

    report_ids = [r["id"] for r in reports]
    db.table("shop_reports").update({"status": "sent_to_linear"}).in_("id", report_ids).execute()
    logger.info("Marked reports as sent_to_linear", count=len(report_ids))
