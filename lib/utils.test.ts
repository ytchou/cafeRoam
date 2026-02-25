import { describe, it, expect } from 'vitest';
import { cn, safeReturnTo } from './utils';

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });
});

describe('safeReturnTo()', () => {
  it('passes through valid relative paths', () => {
    expect(safeReturnTo('/settings')).toBe('/settings');
    expect(safeReturnTo('/onboarding/consent')).toBe('/onboarding/consent');
  });

  it('falls back to / for null or empty', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo(undefined)).toBe('/');
    expect(safeReturnTo('')).toBe('/');
  });

  it('rejects protocol-relative URLs (// open redirect)', () => {
    expect(safeReturnTo('//evil.com')).toBe('/');
    expect(safeReturnTo('//evil.com/path')).toBe('/');
  });

  it('rejects absolute URLs', () => {
    expect(safeReturnTo('https://evil.com')).toBe('/');
    expect(safeReturnTo('http://evil.com/phish')).toBe('/');
  });
});
