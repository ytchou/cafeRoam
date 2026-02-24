import resend as resend_sdk

from models.types import EmailMessage, EmailSendResult


class ResendEmailAdapter:
    def __init__(self, api_key: str, default_from: str):
        resend_sdk.api_key = api_key
        self._default_from = default_from

    async def send(self, message: EmailMessage) -> EmailSendResult:
        result = resend_sdk.Emails.send(
            {
                "from": message.from_address or self._default_from,
                "to": message.to,
                "subject": message.subject,
                "html": message.html,
            }
        )
        return EmailSendResult(id=result["id"])
