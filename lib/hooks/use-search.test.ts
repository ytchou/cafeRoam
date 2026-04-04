import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Declare mock with vi.hoisted to avoid hoisting ReferenceError
const mockFetchWithAuth = vi.hoisted(() => vi.fn());
const mockFetchOptionalAuth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: mockFetchWithAuth,
  fetchOptionalAuth: mockFetchOptionalAuth,
}));

// SWR wrapper
import { SWRConfig } from 'swr';
import React from 'react';
const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      SWRConfig,
      { value: { provider: () => new Map() } },
      children
    );
  Wrapper.displayName = 'SWRTestWrapper';
  return Wrapper;
};

import { useSearch } from './use-search';

const MOCK_RESULTS = [
  {
    id: 'shop-001',
    name: '山小孩咖啡',
    slug: 'shan-xiao-hai-ka-fei',
    rating: 4.6,
  },
];

describe('useSearch', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockClear();
    mockFetchOptionalAuth.mockClear();
  });

  it('does not fetch when query is null', () => {
    renderHook(() => useSearch(null, null), { wrapper: createWrapper() });
    expect(mockFetchOptionalAuth).not.toHaveBeenCalled();
  });

  it('fetches search results when query is provided', async () => {
    mockFetchOptionalAuth.mockResolvedValue({ results: MOCK_RESULTS });
    const { result } = renderHook(() => useSearch('espresso bar', null), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(mockFetchOptionalAuth).toHaveBeenCalledWith(
      expect.stringContaining('search')
    );
  });

  it('passes mode parameter when set', async () => {
    mockFetchOptionalAuth.mockResolvedValue({ results: [] });
    renderHook(() => useSearch('coffee', 'work'), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchOptionalAuth).toHaveBeenCalled());
    expect(mockFetchOptionalAuth).toHaveBeenCalledWith(
      expect.stringContaining('mode=work')
    );
  });

  it('returns isLoading=true while fetching', () => {
    mockFetchOptionalAuth.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSearch('latte', null), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });
});
