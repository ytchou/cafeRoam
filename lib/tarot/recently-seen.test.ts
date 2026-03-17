import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRecentlySeenIds,
  addRecentlySeenIds,
  clearRecentlySeen,
  STORAGE_KEY,
  MAX_SEEN,
} from './recently-seen';

describe('recently-seen localStorage utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when nothing stored', () => {
    expect(getRecentlySeenIds()).toEqual([]);
  });

  it('stores and retrieves shop IDs', () => {
    addRecentlySeenIds(['s1', 's2', 's3']);
    expect(getRecentlySeenIds()).toEqual(['s1', 's2', 's3']);
  });

  it('appends to existing IDs', () => {
    addRecentlySeenIds(['s1', 's2']);
    addRecentlySeenIds(['s3', 's4']);
    expect(getRecentlySeenIds()).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('caps at MAX_SEEN (9) by dropping oldest', () => {
    addRecentlySeenIds(['s1', 's2', 's3']);
    addRecentlySeenIds(['s4', 's5', 's6']);
    addRecentlySeenIds(['s7', 's8', 's9']);
    addRecentlySeenIds(['s10']);
    const ids = getRecentlySeenIds();
    expect(ids.length).toBe(MAX_SEEN);
    expect(ids).not.toContain('s1'); // oldest dropped
  });

  it('clears all seen IDs', () => {
    addRecentlySeenIds(['s1', 's2']);
    clearRecentlySeen();
    expect(getRecentlySeenIds()).toEqual([]);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(getRecentlySeenIds()).toEqual([]);
  });
});
