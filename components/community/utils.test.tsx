import { describe, expect, it, vi } from 'vitest';

import { formatRelativeTime, getInitial } from './utils';

describe('getInitial', () => {
  it('returns the first character of a name', () => {
    expect(getInitial('Mei-Ling ☕')).toBe('M');
  });

  it('returns the first letter for CJK names', () => {
    expect(getInitial('陳小明')).toBe('陳');
  });

  it('returns ? when the name has no letters', () => {
    expect(getInitial('123')).toBe('?');
  });
});

describe('formatRelativeTime', () => {
  it('returns "today" when the date is within the same day', () => {
    const now = new Date('2026-03-18T12:00:00').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(formatRelativeTime('2026-03-18T08:00:00')).toBe('today');

    vi.restoreAllMocks();
  });

  it('returns "1d ago" for yesterday', () => {
    const now = new Date('2026-03-18T12:00:00').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(formatRelativeTime('2026-03-17T12:00:00')).toBe('1d ago');

    vi.restoreAllMocks();
  });

  it('returns N days ago within the same week', () => {
    const now = new Date('2026-03-18T12:00:00').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(formatRelativeTime('2026-03-15T12:00:00')).toBe('3d ago');

    vi.restoreAllMocks();
  });

  it('returns "1w ago" for exactly one week', () => {
    const now = new Date('2026-03-18T12:00:00').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(formatRelativeTime('2026-03-11T12:00:00')).toBe('1w ago');

    vi.restoreAllMocks();
  });

  it('returns multiple weeks ago beyond one week', () => {
    const now = new Date('2026-03-18T12:00:00').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(formatRelativeTime('2026-03-04T12:00:00')).toBe('2w ago');

    vi.restoreAllMocks();
  });
});
