from core.config import settings
from providers.email.interface import EmailProvider


def get_email_provider() -> EmailProvider:
    match settings.email_provider:
        case "resend":
            from providers.email.resend_adapter import ResendEmailAdapter

            return ResendEmailAdapter(
                api_key=settings.resend_api_key,
                default_from=settings.email_from,
            )
        case _:
            raise ValueError(f"Unknown email provider: {settings.email_provider}")
