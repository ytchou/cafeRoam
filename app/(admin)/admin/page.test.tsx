import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSupabaseAuth } from '@/lib/test-utils/mocks';

const mockAuth = createMockSupabaseAuth();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

import AdminDashboard from './page';

describe('Admin overview page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('renders overview stat cards with pending submissions count', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job_counts: { pending: 3, completed: 10 },
          recent_submissions: [],
          pending_review_count: 3,
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          today_total_usd: 1.23,
          mtd_total_usd: 15.0,
          providers: [],
        }),
      } as unknown as Response);

    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/submissions/i)).toBeInTheDocument();
      expect(screen.getByText(/claims/i)).toBeInTheDocument();
      expect(screen.getByText(/spend/i)).toBeInTheDocument();
    });
  });

  it('overview cards link to their sub-routes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        job_counts: {},
        recent_submissions: [],
        pending_review_count: 0,
        today_total_usd: 0,
        mtd_total_usd: 0,
        providers: [],
        claims: [],
        pending_count: 0,
      }),
    } as unknown as Response);

    render(<AdminDashboard />);
    await waitFor(() => {
      const submissionsLink = screen.getByRole('link', {
        name: /submissions/i,
      });
      expect(submissionsLink).toHaveAttribute('href', '/admin/submissions');
    });
  });
});
