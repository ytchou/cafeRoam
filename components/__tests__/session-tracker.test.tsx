import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { SessionTracker } from '../session-tracker';

describe('SessionTracker', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls heartbeat endpoint and fires session_start event on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        days_since_first_session: 3,
        previous_sessions: 5,
      }),
    });

    render(<SessionTracker />);

    await waitFor(() => {
      const analyticsCall = mockFetch.mock.calls.find(
        (c) => c[0] === '/api/analytics/events'
      );
      expect(analyticsCall).toBeDefined();
      const body = JSON.parse(analyticsCall![1].body);
      expect(body.event).toBe('session_start');
      expect(body.properties).toEqual({
        days_since_first_session: 3,
        previous_sessions: 5,
      });
    });
  });

  it('does not fire event when heartbeat request fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Unauthorized' }),
    });

    render(<SessionTracker />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const analyticsCall = mockFetch.mock.calls.find(
      (c) => c[0] === '/api/analytics/events'
    );
    expect(analyticsCall).toBeUndefined();
  });
});
