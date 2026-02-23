import type { IAnalyticsProvider } from './analytics.interface';
import { PostHogAdapter } from './posthog.adapter';

export function getAnalyticsProvider(): IAnalyticsProvider {
  const provider = process.env.ANALYTICS_PROVIDER ?? 'posthog';

  switch (provider) {
    case 'posthog':
      return new PostHogAdapter();
    default:
      throw new Error(`Unknown analytics provider: ${provider}`);
  }
}

export type { IAnalyticsProvider } from './analytics.interface';
