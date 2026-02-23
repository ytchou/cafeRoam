export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<{ id: string }>;
}
