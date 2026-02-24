import asyncio
from functools import partial

import resend as resend_sdk

from models.types import EmailMessage, EmailSendResult


class ResendEmailAdapter:
    def __init__(self, api_key: str, default_from: str):
        resend_sdk.api_key = api_key
        self._default_from = default_from

    async def send(self, message: EmailMessage) -> EmailSendResult:
        params: resend_sdk.Emails.SendParams = {
            "from": message.from_address or self._default_from,
            "to": message.to,
            "subject": message.subject,
            "html": message.html,
        }
        # resend_sdk.Emails.send is synchronous — run in thread to avoid blocking event loop
        result = await asyncio.to_thread(partial(resend_sdk.Emails.send, params))
        return EmailSendResult(id=result["id"])
