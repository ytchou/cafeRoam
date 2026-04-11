import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('TimingSection', () => {
  const jobWithTimings = {
    id: 'job-1',
    job_type: 'enrich_shop',
    status: 'completed',
    priority: 0,
    attempts: 1,
    created_at: '2026-04-11T01:00:00Z',
    last_error: null,
    payload: { shop_id: 'shop-1' },
    claimed_at: '2026-04-11T01:00:01Z',
    completed_at: '2026-04-11T01:00:09.300Z',
    step_timings: {
      fetch_data: { duration_ms: 120 },
      llm_call: { duration_ms: 7800 },
      db_write: { duration_ms: 95 },
    },
  };

  const jobWithoutTimings = {
    ...jobWithTimings,
    id: 'job-2',
    claimed_at: null,
    completed_at: null,
    step_timings: null,
  };

  beforeEach(() => {
    setupAuth();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [jobWithTimings, jobWithoutTimings], total: 2 }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows timing section with total and step bars when step_timings present', async () => {
    render(<RawJobsList />);
    await screen.findAllByText('enrich_shop');

    // Expand the first job row
    const rows = screen.getAllByRole('row');
    const jobRow = rows.find((r) => r.textContent?.includes('enrich_shop'));
    expect(jobRow).toBeDefined();
    fireEvent.click(jobRow!);

    // Timing section should be visible
    expect(await screen.findByText(/Timing/i)).toBeInTheDocument();
    expect(screen.getByText(/fetch_data/)).toBeInTheDocument();
    expect(screen.getByText(/llm_call/)).toBeInTheDocument();
    expect(screen.getByText(/db_write/)).toBeInTheDocument();
    // Total duration (8300ms = 8.3s)
    expect(screen.getByText(/8\.3s|8300ms/i)).toBeInTheDocument();
  });

  it('does not show timing section when step_timings is null', async () => {
    render(<RawJobsList />);
    await screen.findAllByText('enrich_shop');

    // Expand the second job row (no timings)
    screen.getAllByText('enrich_shop');
    // Click the second row's toggle
    const rows = screen.getAllByRole('row');
    const secondJobRow = rows.filter((r) => r.textContent?.includes('job-2'))[0];
    if (secondJobRow) fireEvent.click(secondJobRow);

    // Should not find a timing section
    expect(screen.queryByText(/Timing/i)).not.toBeInTheDocument();
  });
});
