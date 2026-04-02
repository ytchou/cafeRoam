import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock fetchWithAuth at the module level
const mockFetchWithAuth = vi.fn();
vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: mockFetchWithAuth,
}));

describe('useAnalytics', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset();
    mockFetchWithAuth.mockResolvedValue({ status: 'ok' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('tracks an event to the backend when analytics is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.resetModules();
    const { useAnalytics } = await import('../use-analytics');
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.capture('filter_applied', {
        filter_type: 'sheet',
        filter_value: ['wifi', 'quiet'],
      });
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'filter_applied',
        properties: { filter_type: 'sheet', filter_value: ['wifi', 'quiet'] },
      }),
    });
  });

  it('does not send events when analytics is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.resetModules();
    const { useAnalytics } = await import('../use-analytics');
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.capture('filter_applied', {
        filter_type: 'sheet',
        filter_value: ['quiet'],
      });
    });

    expect(mockFetchWithAuth).not.toHaveBeenCalled();
  });

  it('a network failure does not break the calling component', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.resetModules();
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'));
    const { useAnalytics } = await import('../use-analytics');
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.capture('filter_applied', {
        filter_type: 'sheet',
        filter_value: ['quiet'],
      });
    });
  });
});
