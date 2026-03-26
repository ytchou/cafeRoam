import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import SubmitPage from './page';
import { fetchWithAuth } from '@/lib/api/fetch';

const mockFetchWithAuth = vi.mocked(fetchWithAuth);

describe('SubmitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithAuth.mockResolvedValue([]);
  });

  it('renders the submission form with a URL input', async () => {
    render(<SubmitPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/google maps/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid URL', async () => {
    render(<SubmitPage />);
    const input = await screen.findByPlaceholderText(/google maps/i);
    const button = screen.getByRole('button', { name: /送出/i });

    await userEvent.type(input, 'https://example.com');
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/有效的 Google Maps/i)).toBeInTheDocument();
    });
  });

  it('renders submission history with statuses', async () => {
    mockFetchWithAuth.mockResolvedValue([
      {
        id: '1',
        google_maps_url: 'https://maps.google.com/?cid=1',
        status: 'live',
        created_at: '2026-03-26T00:00:00Z',
      },
      {
        id: '2',
        google_maps_url: 'https://maps.google.com/?cid=2',
        status: 'pending_review',
        created_at: '2026-03-25T00:00:00Z',
      },
      {
        id: '3',
        google_maps_url: 'https://maps.google.com/?cid=3',
        status: 'rejected',
        rejection_reason: 'permanently_closed',
        created_at: '2026-03-24T00:00:00Z',
      },
    ]);

    render(<SubmitPage />);

    await waitFor(() => {
      expect(screen.getByText('已上線')).toBeInTheDocument();
      expect(screen.getByText('審核中')).toBeInTheDocument();
      expect(screen.getByText('此店已永久關閉')).toBeInTheDocument();
    });
  });
});
