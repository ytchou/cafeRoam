import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RawJobsList } from './RawJobsList';

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

function makeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'job-abc123',
    job_type: 'enrich_shop',
    status: 'claimed',
    priority: 5,
    attempts: 1,
    created_at: '2026-04-10T00:00:00Z',
    last_error: null,
    payload: { shop_id: 'shop-xyz789' },
    ...overrides,
  };
}

function makeJobsResponse(jobs: ReturnType<typeof makeJob>[] = []) {
  return { jobs, total: jobs.length };
}

function setupAuth() {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: AUTH_TOKEN } },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('RawJobsList — force fail + logs panel', () => {
  it('force fail button is labeled "Force fail"', async () => {
    setupAuth();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(makeJobsResponse([makeJob({ status: 'claimed' })])),
      })
    );

    render(<RawJobsList />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Force fail' })
      ).toBeInTheDocument();
    });
  });

  it('force fail dialog includes reason textarea', async () => {
    setupAuth();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(makeJobsResponse([makeJob({ status: 'pending' })])),
      })
    );

    const user = userEvent.setup();
    render(<RawJobsList />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Force fail' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Force fail' }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Reason (optional)')
      ).toBeInTheDocument();
    });
  });

  it('force fail sends reason in POST body when textarea is filled', async () => {
    setupAuth();
    const fetchMock = vi.fn();
    // First call: load jobs list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeJobsResponse([makeJob({ id: 'job-stuck01', status: 'claimed' })])
        ),
    });
    // Second call: cancel endpoint
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    // Third call: reload jobs after cancel
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeJobsResponse([])),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<RawJobsList />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Force fail' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Force fail' }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Reason (optional)')
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText('Reason (optional)'),
      'stuck job'
    );

    // Click the confirm button in the dialog
    const confirmButtons = screen.getAllByRole('button', {
      name: /Force fail/i,
    });
    // The dialog confirm button is the last one
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      const cancelCall = fetchMock.mock.calls.find((call) =>
        (call[0] as string).includes('/cancel')
      );
      expect(cancelCall).toBeDefined();
      const body = JSON.parse((cancelCall![1] as RequestInit).body as string);
      expect(body).toEqual({ reason: 'stuck job' });
    });
  });

  it('force fail sends empty body when textarea is blank', async () => {
    setupAuth();
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeJobsResponse([makeJob({ id: 'job-blank01', status: 'claimed' })])
        ),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeJobsResponse([])),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<RawJobsList />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Force fail' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Force fail' }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Reason (optional)')
      ).toBeInTheDocument();
    });

    // Do NOT fill the textarea — leave it blank
    const confirmButtons = screen.getAllByRole('button', {
      name: /Force fail/i,
    });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      const cancelCall = fetchMock.mock.calls.find((call) =>
        (call[0] as string).includes('/cancel')
      );
      expect(cancelCall).toBeDefined();
      // Empty reason → body should be "{}" or omitted
      const rawBody = (cancelCall![1] as RequestInit).body as
        | string
        | undefined;
      if (rawBody) {
        const body = JSON.parse(rawBody);
        expect(Object.keys(body)).toHaveLength(0);
      } else {
        expect(rawBody).toBeUndefined();
      }
    });
  });

  it('JobLogsPanel is shown when a running job row is expanded', async () => {
    setupAuth();
    const fetchMock = vi.fn();
    // Jobs list fetch
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeJobsResponse([
            makeJob({ id: 'job-running01', status: 'claimed' }),
          ])
        ),
    });
    // JobLogsPanel fetch (polls /logs endpoint)
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ logs: [], job_status: 'claimed' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<RawJobsList />);

    await waitFor(() => {
      expect(screen.getByText('enrich_shop')).toBeInTheDocument();
    });

    // Click the row to expand it
    await user.click(screen.getByText('enrich_shop'));

    await waitFor(() => {
      const logsFetch = fetchMock.mock.calls.find((call) =>
        (call[0] as string).includes('/logs')
      );
      expect(logsFetch).toBeDefined();
    });
  });
});
