import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const gtagCalls: unknown[][] = [];

describe('GA4 event helpers', () => {
  beforeEach(() => {
    gtagCalls.length = 0;
    Object.defineProperty(window, 'gtag', {
      value: (...args: unknown[]) => gtagCalls.push(args),
      writable: true,
      configurable: true,
    });
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST12345');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('trackSearch sends a search event with the search term', async () => {
    const { trackSearch } = await import('../ga4-events');
    trackSearch('quiet cafe near Taipei 101');

    expect(gtagCalls).toContainEqual([
      'event',
      'search',
      { search_term: 'quiet cafe near Taipei 101' },
    ]);
  });

  it('trackShopDetailView sends a shop_detail_view event with the shop ID', async () => {
    const { trackShopDetailView } = await import('../ga4-events');
    trackShopDetailView('shop_abc123');

    expect(gtagCalls).toContainEqual([
      'event',
      'shop_detail_view',
      { shop_id: 'shop_abc123' },
    ]);
  });

  it('trackSignupCtaClick sends a signup_cta_click event with the CTA location', async () => {
    const { trackSignupCtaClick } = await import('../ga4-events');
    trackSignupCtaClick('header');

    expect(gtagCalls).toContainEqual([
      'event',
      'signup_cta_click',
      { cta_location: 'header' },
    ]);
  });

  it('does not fire events when GA measurement ID is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    vi.resetModules();
    const { trackSearch } = await import('../ga4-events');
    trackSearch('test query');

    expect(gtagCalls).toHaveLength(0);
  });
});
