import { describe, it, expect } from 'vitest';
import { cn } from './utils';

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
