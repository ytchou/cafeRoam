import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

import { useSearchState } from './use-search-state';

describe('useSearchState', () => {
  beforeEach(() => {
    mockPush.mockClear();
    // Reset search params
    mockSearchParams.delete('q');
    mockSearchParams.delete('mode');
    mockSearchParams.delete('filters');
    mockSearchParams.delete('view');
  });

  it('a user returning to a search URL sees their previous query pre-filled', () => {
    mockSearchParams.set('q', 'espresso bar');
    const { result } = renderHook(() => useSearchState());
    expect(result.current.query).toBe('espresso bar');
  });

  it('a user returning to a mode-filtered URL sees the correct mode active', () => {
    mockSearchParams.set('mode', 'work');
    const { result } = renderHook(() => useSearchState());
    expect(result.current.mode).toBe('work');
  });

  it('a user sharing a filtered URL sees the same filters active when they open it', () => {
    mockSearchParams.set('filters', 'outlet,wifi');
    const { result } = renderHook(() => useSearchState());
    expect(result.current.filters).toEqual(['outlet', 'wifi']);
  });

  it('returns empty defaults when no params present', () => {
    const { result } = renderHook(() => useSearchState());
    expect(result.current.query).toBe('');
    expect(result.current.mode).toBeNull();
    expect(result.current.filters).toEqual([]);
  });

  it('when a user types a query, the URL updates so they can share the search', () => {
    const { result } = renderHook(() => useSearchState());
    act(() => {
      result.current.setQuery('cappuccino');
    });
    expect(mockPush).toHaveBeenCalled();
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=cappuccino');
  });

  it('clearAll removes all search params', () => {
    mockSearchParams.set('q', 'latte');
    mockSearchParams.set('mode', 'work');
    const { result } = renderHook(() => useSearchState());
    act(() => {
      result.current.clearAll();
    });
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\//));
  });

  it('returns view as "map" when ?view param is absent', () => {
    const { result } = renderHook(() => useSearchState());
    expect(result.current.view).toBe('map');
  });

  it('reads view from ?view=list URL param', () => {
    mockSearchParams.set('view', 'list');
    const { result } = renderHook(() => useSearchState());
    expect(result.current.view).toBe('list');
  });

  it('when a user switches to list view, the URL updates so the view persists on refresh', () => {
    const { result } = renderHook(() => useSearchState());
    act(() => {
      result.current.setView('list');
    });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain('view=list');
  });

  it('clearAll removes view param', () => {
    mockSearchParams.set('view', 'list');
    const { result } = renderHook(() => useSearchState());
    act(() => { result.current.clearAll(); });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('view=');
  });
});
