import { describe, it, expect } from 'vitest';
import { classifySocialUrl } from './url-classifier';

describe('classifySocialUrl', () => {
  it('classifies instagram.com URL', () => {
    expect(classifySocialUrl('https://www.instagram.com/somecafe')).toEqual({
      instagram_url: 'https://www.instagram.com/somecafe',
      facebook_url: null,
      threads_url: null,
    });
  });

  it('classifies instagr.am shortlink', () => {
    const r = classifySocialUrl('https://instagr.am/p/abc123');
    expect(r.instagram_url).toBe('https://instagr.am/p/abc123');
  });

  it('classifies fb.me shortlink', () => {
    const r = classifySocialUrl('https://fb.me/somepage');
    expect(r.facebook_url).toBe('https://fb.me/somepage');
  });

  it('classifies m.facebook.com', () => {
    const r = classifySocialUrl('https://m.facebook.com/cafe');
    expect(r.facebook_url).toBe('https://m.facebook.com/cafe');
  });

  it('classifies threads.net URL', () => {
    expect(classifySocialUrl('https://www.threads.net/@cafe')).toEqual({
      instagram_url: null,
      facebook_url: null,
      threads_url: 'https://www.threads.net/@cafe',
    });
  });

  it('returns all null for unrecognized URL', () => {
    expect(classifySocialUrl('https://www.somecafe.com')).toEqual({
      instagram_url: null,
      facebook_url: null,
      threads_url: null,
    });
  });

  it('returns all null for null input', () => {
    expect(classifySocialUrl(null)).toEqual({
      instagram_url: null,
      facebook_url: null,
      threads_url: null,
    });
  });

  it('returns all null for invalid URL string', () => {
    expect(classifySocialUrl('not-a-url')).toEqual({
      instagram_url: null,
      facebook_url: null,
      threads_url: null,
    });
  });
});
