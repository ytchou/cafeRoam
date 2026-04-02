import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  beforeSend(event) {
    const req = event.request;
    if (req?.headers) {
      const headers = req.headers as Record<string, string>;
      for (const key of [
        'Authorization',
        'authorization',
        'Cookie',
        'cookie',
      ]) {
        delete headers[key];
      }
    }
    delete event.user;
    return event;
  },
});
