/**
 * PDPA-safe analytics traits — only non-PII scalar properties allowed.
 * Do NOT add email, name, phone, or any personally-identifying fields here.
 */
export interface AnalyticsTraits {
  plan?: string;
  role?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface IAnalyticsProvider {
  track(
    event: string,
    properties?: Record<string, string | number | boolean>
  ): void;
  identify(userId: string, traits?: AnalyticsTraits): void;
  page(
    name?: string,
    properties?: Record<string, string | number | boolean>
  ): void;
}
