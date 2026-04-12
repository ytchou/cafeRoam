import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  createMockSupabaseAuth,
  createMockRouter,
} from '@/lib/test-utils/mocks';
import { makeSession } from '@/lib/test-utils/factories';

const mockAuth = createMockSupabaseAuth();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

const mockUseSearchParams = vi.fn(() => new URLSearchParams());
const mockRouter = createMockRouter();
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/admin/jobs',
  useSearchParams: () => mockUseSearchParams(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const testSession = makeSession();

import { RawJobsList } from '../RawJobsList';

function makeJobsResponse(
  jobs: Array<Record<string, unknown>> = [],
  total?: number
) {
  return {
    jobs,
    total: total ?? jobs.length,
    page: 1,
    page_size: 20,
  };
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-123',
    job_type: 'enrich_shop',
    status: 'cancelled',
    reason_code: 'operator_cancelled',
    cancel_reason: 'Admin cancelled',
    cancelled_at: '2026-04-12T10:00:00Z',
    failed_at: null,
    priority: 0,
    attempts: 1,
    created_at: '2026-04-12T09:00:00Z',
    claimed_at: null,
    completed_at: null,
    step_timings: null,
    last_error: null,
    payload: {},
    ...overrides,
  };
}

describe('ReasonCodeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows reason_code badge when job has operator_cancelled reason', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeJobsResponse([makeJob()])),
    });

    render(<RawJobsList initialStatus="all" />);

    await waitFor(() => {
      expect(screen.getByText('enrich_shop')).toBeInTheDocument();
    });

    const tbody = screen.getAllByRole('rowgroup')[1];
    const row = within(tbody).getAllByRole('row')[0];

    expect(within(row).getByText('operator_cancelled')).toBeInTheDocument();
  });

  it('renders nothing for null reason_code', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeJobsResponse([makeJob({ reason_code: null, cancel_reason: null })])
        ),
    });

    render(<RawJobsList initialStatus="all" />);

    await waitFor(() => {
      expect(screen.getByText('enrich_shop')).toBeInTheDocument();
    });

    const tbody = screen.getAllByRole('rowgroup')[1];
    const row = within(tbody).getAllByRole('row')[0];

    expect(
      within(row).queryByText('operator_cancelled')
    ).not.toBeInTheDocument();
  });
});

describe('RawJobsList reason_code filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders reason_code filter combobox and initial fetch has no reason_code param', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeJobsResponse([makeJob()])),
    });

    render(<RawJobsList initialStatus="all" />);

    await waitFor(() => {
      expect(screen.getByText('enrich_shop')).toBeInTheDocument();
    });

    // Three filter comboboxes: status, type, reason_code
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(3);

    // Initial fetch should not include reason_code param (default is 'all' = no filter)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.not.stringContaining('reason_code='),
      expect.anything()
    );
  });
});
