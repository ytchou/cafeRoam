import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpendHistoryChart } from '../SpendHistoryChart';

const mockGetToken = vi.fn().mockResolvedValue('mock-token');

const mockHistoryData = {
  history: [
    {
      date: '2026-04-01',
      providers: { anthropic: 1.5, openai: 0.25, apify: 0.03 },
    },
    {
      date: '2026-04-02',
      providers: { anthropic: 0.8, openai: 0.1, apify: 0.0 },
    },
  ],
};

describe('SpendHistoryChart', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetToken.mockResolvedValue('mock-token');
  });

  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<SpendHistoryChart getToken={mockGetToken} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders chart heading after data loads', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHistoryData,
    } as Response);

    render(<SpendHistoryChart getToken={mockGetToken} />);
    await waitFor(() => {
      expect(screen.getByText(/daily spend/i)).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<SpendHistoryChart getToken={mockGetToken} />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('shows no data message when history is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ history: [] }),
    } as Response);

    render(<SpendHistoryChart getToken={mockGetToken} />);
    await waitFor(() => {
      expect(screen.getByText(/no spend data/i)).toBeInTheDocument();
    });
  });
});
