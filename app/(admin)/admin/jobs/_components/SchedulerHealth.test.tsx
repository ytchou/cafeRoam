import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SchedulerHealth } from './SchedulerHealth';

const { mockGetSession, mockCreateClient } = vi.hoisted(() => {
  const getSession = vi.fn();
  const createClient = vi.fn(() => ({
    auth: {
      getSession,
    },
  }));

  return {
    mockGetSession: getSession,
    mockCreateClient: createClient,
  };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

const AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin-session-token.signature';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('SchedulerHealth', () => {
  it('shows Loading... while the scheduler request is in flight', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: AUTH_TOKEN,
        },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined))
    );

    render(<SchedulerHealth />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/pipeline/scheduler-health',
        {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }
      );
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows an authentication error when there is no active session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<SchedulerHealth />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not authenticated');
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders the scheduler status table for an authenticated admin', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: AUTH_TOKEN,
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'ok',
          registered_jobs: 2,
          jobs: [
            { id: 'job-a', next_run: '2026-01-01T00:00:00Z' },
            { id: 'job-b', next_run: null },
          ],
          last_poll_at: '2026-01-01T12:00:00Z',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<SchedulerHealth />);

    await waitFor(() => {
      expect(screen.getByText('2 jobs registered')).toBeInTheDocument();
    });

    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('job-a')).toBeInTheDocument();
    expect(screen.getByText('job-b')).toBeInTheDocument();
    expect(screen.getByText('not scheduled')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/pipeline/scheduler-health',
      {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      }
    );
  });

  it('shows the API error detail when the scheduler endpoint fails', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: AUTH_TOKEN,
        },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: 'Scheduler offline' }),
      })
    );

    render(<SchedulerHealth />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Scheduler offline');
    });
  });
});
