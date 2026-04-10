import { renderHook, waitFor } from '@testing-library/react';
import { useSearchSuggestions } from './use-search-suggestions';
import { vi } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockSuggestResponse(
  completions: string[],
  tags: { id: string; label: string }[]
) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ completions, tags }),
  });
}

describe('useSearchSuggestions', () => {
  beforeEach(() => mockFetch.mockClear());

  it('returns empty results when query is empty', () => {
    const { result } = renderHook(() => useSearchSuggestions(''));
    expect(result.current.completions).toEqual([]);
    expect(result.current.tags).toEqual([]);
  });

  it('fetches from /api/search/suggest after debounce', async () => {
    mockSuggestResponse(['安靜可以工作'], [{ id: 'tag_1', label: '安靜' }]);
    const { result } = renderHook(() => useSearchSuggestions('安靜'));

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/search/suggest?q='),
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
      },
      { timeout: 500 }
    );

    await waitFor(() => {
      expect(result.current.completions).toEqual(['安靜可以工作']);
    });
  });

  it('does not fetch when query length is 0', async () => {
    vi.useFakeTimers();
    renderHook(() => useSearchSuggestions(''));
    await vi.advanceTimersByTimeAsync(400);
    expect(mockFetch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
