import type { IEmailProvider } from './email.interface';
import { ResendAdapter } from './resend.adapter';

export function getEmailProvider(): IEmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? 'resend';

  switch (provider) {
    case 'resend':
      return new ResendAdapter();
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}

export type { IEmailProvider, EmailMessage } from './email.interface';
