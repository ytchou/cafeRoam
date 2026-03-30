import { describe, it, expect } from 'vitest';
import { FILTER_TO_TAG_IDS, SPECIAL_FILTERS } from '../filter-map';

describe('filter-map', () => {
  it('maps wifi filter to wifi_available taxonomy tag', () => {
    expect(FILTER_TO_TAG_IDS['wifi']).toBe('wifi_available');
  });

  it('maps outlet filter to power_outlets taxonomy tag', () => {
    expect(FILTER_TO_TAG_IDS['outlet']).toBe('power_outlets');
  });

  it('maps quiet filter to quiet taxonomy tag', () => {
    expect(FILTER_TO_TAG_IDS['quiet']).toBe('quiet');
  });

  it('does not include special filters in tag mapping', () => {
    expect(FILTER_TO_TAG_IDS['open_now']).toBeUndefined();
    expect(FILTER_TO_TAG_IDS['rating']).toBeUndefined();
  });

  it('lists open_now and rating as special filters', () => {
    expect(SPECIAL_FILTERS).toContain('open_now');
    expect(SPECIAL_FILTERS).toContain('rating');
  });
});
