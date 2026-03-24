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

  it('POSTs event to /api/analytics/events when key is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.resetModules();
    const { useAnalytics } = await import('../use-analytics');
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.capture('filter_applied', {
        filter_type: 'mode',
        filter_value: 'work',
      });
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'filter_applied',
        properties: { filter_type: 'mode', filter_value: 'work' },
      }),
    });
  });

  it('no-ops when PostHog key is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.resetModules();
    const { useAnalytics } = await import('../use-analytics');
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.capture('test_event', { foo: 'bar' });
    });

    expect(mockFetchWithAuth).not.toHaveBeenCalled();
  });

  it('does not throw on fetch failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.resetModules();
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'));
    const { useAnalytics } = await import('../use-analytics');
    const { result } = renderHook(() => useAnalytics());

    // Should not throw
    act(() => {
      result.current.capture('test_event', { foo: 'bar' });
    });
  });
});
