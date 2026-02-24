from typing import Protocol

from models.types import EmailMessage, EmailSendResult


class EmailProvider(Protocol):
    async def send(self, message: EmailMessage) -> EmailSendResult: ...
