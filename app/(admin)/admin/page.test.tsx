import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSupabaseAuth,
  createMockRouter,
} from '@/lib/test-utils/mocks';
import { makeSession } from '@/lib/test-utils/factories';

const mockAuth = createMockSupabaseAuth();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

const mockRouter = createMockRouter();
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/admin',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const testSession = makeSession();

import AdminDashboard from './page';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null,
    });
  });

  it('renders pipeline overview with job counts when API returns data', async () => {
    const overviewData = {
      job_counts: {
        pending: 12,
        claimed: 3,
        completed: 45,
        failed: 2,
        dead_letter: 1,
      },
      recent_submissions: [
        {
          id: 'sub-abc123',
          google_maps_url: 'https://maps.google.com/?cid=1234567890',
          status: 'live',
          created_at: '2026-03-01T08:30:00.000Z',
        },
        {
          id: 'sub-def456',
          google_maps_url: 'https://maps.google.com/?cid=9876543210',
          status: 'failed',
          created_at: '2026-02-28T14:00:00.000Z',
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(overviewData),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pipeline Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('claimed')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('dead_letter')).toBeInTheDocument();

    // "failed" appears in both the job queue status label and a submission badge
    const failedElements = screen.getAllByText('failed');
    expect(failedElements.length).toBe(2);

    expect(
      screen.getByText('https://maps.google.com/?cid=1234567890')
    ).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /view 2 failed jobs/i })
    ).toHaveAttribute('href', '/admin/jobs?status=failed');

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/pipeline/overview', {
      headers: {
        Authorization: `Bearer ${testSession.access_token}`,
      },
    });
  });

  it('shows error message when the pipeline API returns an error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Forbidden: admin role required' }),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Forbidden: admin role required')
    ).toBeInTheDocument();
  });
});
