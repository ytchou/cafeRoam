import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

import AdminJobsPage from './page';

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

describe('AdminJobsPage', () => {
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

  it('renders jobs table with data from the pipeline jobs API', async () => {
    const jobsResponse = makeJobsResponse([
      {
        id: 'job-abc123',
        job_type: 'enrich_shop',
        status: 'completed',
        priority: 10,
        attempts: 1,
        created_at: '2026-03-01T08:30:00.000Z',
        error: null,
        payload: { shop_id: 'shop-d4e5f6' },
      },
      {
        id: 'job-def456',
        job_type: 'generate_embedding',
        status: 'failed',
        priority: 5,
        attempts: 3,
        created_at: '2026-02-28T14:00:00.000Z',
        error: 'OpenAI API rate limit exceeded. Please retry after 60 seconds.',
        payload: { shop_id: 'shop-g7h8i9', model: 'text-embedding-3-small' },
      },
      {
        id: 'job-ghi789',
        job_type: 'scrape_shop',
        status: 'pending',
        priority: 1,
        attempts: 0,
        created_at: '2026-03-02T10:15:00.000Z',
        error: null,
        payload: { google_maps_url: 'https://maps.google.com/?cid=555' },
      },
    ]);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/pipeline/batches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ batches: [], total: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(jobsResponse),
      });
    });

    const user = userEvent.setup();
    render(<AdminJobsPage />);

    await user.click(screen.getByRole('tab', { name: /raw jobs/i }));

    await waitFor(() => {
      expect(screen.getByText('Jobs Queue')).toBeInTheDocument();
    });

    const tbody = screen.getAllByRole('rowgroup')[1];
    const rows = within(tbody).getAllByRole('row');
    expect(rows).toHaveLength(3);

    expect(within(rows[0]).getByText('enrich_shop')).toBeInTheDocument();
    expect(within(rows[0]).getByText('completed')).toBeInTheDocument();

    expect(within(rows[1]).getByText('generate_embedding')).toBeInTheDocument();
    expect(within(rows[1]).getByText('failed')).toBeInTheDocument();

    expect(within(rows[2]).getByText('scrape_shop')).toBeInTheDocument();
    expect(within(rows[2]).getByText('pending')).toBeInTheDocument();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/pipeline/jobs'),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${testSession.access_token}` },
      })
    );
  });

  it('asks for confirmation and cancels a pending job when the admin clicks Cancel', async () => {
    const jobsResponse = makeJobsResponse([
      {
        id: 'job-cancel-001',
        job_type: 'scrape_shop',
        status: 'pending',
        priority: 1,
        attempts: 0,
        created_at: '2026-03-02T10:15:00.000Z',
        last_error: null,
        payload: { google_maps_url: 'https://maps.google.com/?cid=999' },
      },
    ]);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/pipeline/batches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ batches: [], total: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(jobsResponse),
      });
    });

    const user = userEvent.setup();
    render(<AdminJobsPage />);

    await user.click(screen.getByRole('tab', { name: /raw jobs/i }));

    await waitFor(() => {
      const tbody = screen.getAllByRole('rowgroup')[1];
      expect(within(tbody).getByText('scrape_shop')).toBeInTheDocument();
    });

    // Click Cancel — opens confirmation dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Confirm in alertdialog
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: /cancel job/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/pipeline/jobs/job-cancel-001/cancel',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: `Bearer ${testSession.access_token}` },
        })
      );
    });
  });

  it('retries a failed job when the admin clicks Retry', async () => {
    const jobsResponse = makeJobsResponse([
      {
        id: 'job-retry-001',
        job_type: 'generate_embedding',
        status: 'failed',
        priority: 5,
        attempts: 3,
        created_at: '2026-02-28T14:00:00.000Z',
        last_error:
          'OpenAI API rate limit exceeded. Please retry after 60 seconds.',
        payload: { shop_id: 'shop-d4e5f6', model: 'text-embedding-3-small' },
      },
    ]);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/pipeline/batches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ batches: [], total: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(jobsResponse),
      });
    });

    const user = userEvent.setup();
    render(<AdminJobsPage />);

    await user.click(screen.getByRole('tab', { name: /raw jobs/i }));

    await waitFor(() => {
      const tbody = screen.getAllByRole('rowgroup')[1];
      expect(within(tbody).getByText('generate_embedding')).toBeInTheDocument();
    });

    // Click Retry — opens confirmation dialog
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Confirm in alertdialog
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^retry$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/pipeline/retry/job-retry-001',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: `Bearer ${testSession.access_token}` },
        })
      );
    });
  });

  it('shows error alert when the pipeline jobs API returns a failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Forbidden: admin role required' }),
    });

    render(<AdminJobsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Forbidden: admin role required')
    ).toBeInTheDocument();
  });

  it('auto-selects Raw Jobs tab and failed filter when ?status=failed is in URL', async () => {
    mockUseSearchParams.mockReturnValueOnce(
      new URLSearchParams('status=failed')
    );

    const failedJobsResponse = makeJobsResponse([
      {
        id: 'job-failed-001',
        job_type: 'enrich_shop',
        status: 'failed',
        priority: 5,
        attempts: 2,
        created_at: '2026-03-01T10:00:00.000Z',
        last_error: 'Timeout after 30s',
        payload: { shop_id: 'shop-abc' },
      },
    ]);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/pipeline/batches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ batches: [], total: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(failedJobsResponse),
      });
    });

    render(<AdminJobsPage />);

    // Should show Raw Jobs tab active (not Batches)
    await waitFor(() => {
      expect(screen.getByText('Jobs Queue')).toBeInTheDocument();
    });

    // The Raw Jobs tab should be visible without needing to click it
    await waitFor(() => {
      const tbody = screen.getAllByRole('rowgroup')[1];
      expect(within(tbody).getByText('enrich_shop')).toBeInTheDocument();
    });

    // The failed status filter should be pre-selected
    expect(screen.getByDisplayValue('failed')).toBeInTheDocument();
  });
});
