import type { IEmailProvider, EmailMessage } from './email.interface';

export class ResendAdapter implements IEmailProvider {
  async send(_message: EmailMessage): Promise<{ id: string }> {
    throw new Error('Not implemented');
  }
}
