import type { IAnalyticsProvider } from './analytics.interface';

export class PostHogAdapter implements IAnalyticsProvider {
  track(): void {
    throw new Error('Not implemented');
  }

  identify(): void {
    throw new Error('Not implemented');
  }

  page(): void {
    throw new Error('Not implemented');
  }
}
