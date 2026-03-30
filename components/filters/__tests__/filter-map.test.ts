import { describe, it, expect } from 'vitest';
import { FILTER_TO_TAG_IDS, SPECIAL_FILTERS } from '../filter-map';

describe('filter-map', () => {
  it('a user selecting the wifi filter matches shops tagged wifi_available', () => {
    expect(FILTER_TO_TAG_IDS['wifi']).toBe('wifi_available');
  });

  it('a user selecting the outlet filter matches shops tagged power_outlets', () => {
    expect(FILTER_TO_TAG_IDS['outlet']).toBe('power_outlets');
  });

  it('a user selecting the quiet filter matches shops tagged quiet', () => {
    expect(FILTER_TO_TAG_IDS['quiet']).toBe('quiet');
  });

  it('open_now and rating filters are not in the tag mapping — they use custom logic', () => {
    const map = FILTER_TO_TAG_IDS as Record<string, string>;
    expect(map['open_now']).toBeUndefined();
    expect(map['rating']).toBeUndefined();
  });

  it('open_now and rating are declared as special filters for custom handling', () => {
    expect(SPECIAL_FILTERS).toContain('open_now');
    expect(SPECIAL_FILTERS).toContain('rating');
  });
});
