from typing import Any, cast

import structlog
from supabase import Client

from models.types import EmailMessage
from providers.email.interface import EmailProvider

logger = structlog.get_logger()


async def handle_weekly_email(db: Client, email: EmailProvider) -> None:
    """Send weekly curated email to opted-in users."""
    logger.info("Sending weekly email digest")

    # Get opted-in users
    response = db.table("profiles").select("id, email").eq("email_opted_in", True).execute()
    users = cast("list[dict[str, Any]]", response.data)

    # Build email content (same for all users in V1)
    html_content = "<h1>This Week's CafeRoam Picks</h1><p>Coming soon...</p>"

    sent_count = 0
    for user in users:
        try:
            await email.send(EmailMessage(
                to=user["email"],
                subject="This Week's CafeRoam Picks",
                html=html_content,
            ))
            sent_count += 1
        except Exception as e:
            logger.error("Failed to send weekly email", user_id=user["id"], error=str(e))

    logger.info("Weekly email complete", sent=sent_count, total=len(users))
