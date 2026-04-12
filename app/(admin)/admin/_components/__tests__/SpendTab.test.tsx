import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpendTab } from '../SpendTab';

global.fetch = vi.fn();

const mockGetToken = vi.fn().mockResolvedValue('test-token-abc');

const mockSpendData = {
  today_total_usd: 1.23,
  mtd_total_usd: 45.67,
  providers: [
    {
      provider: 'anthropic',
      today_usd: 1.23,
      mtd_usd: 45.67,
      tasks: [{ task: 'enrich_shop', today_usd: 1.23, mtd_usd: 45.67 }],
    },
  ],
};

describe('SpendTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Today and MTD labels with formatted cost values', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpendData,
    } as Response);

    render(<SpendTab getToken={mockGetToken} />);

    await waitFor(() => {
      expect(screen.getByText(/today/i)).toBeInTheDocument();
      expect(screen.getByText(/mtd/i)).toBeInTheDocument();
      expect(screen.getByText('$1.23')).toBeInTheDocument();
    });
  });

  it('shows provider name in table row', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpendData,
    } as Response);

    render(<SpendTab getToken={mockGetToken} />);

    await waitFor(() => {
      expect(screen.getByText('anthropic')).toBeInTheDocument();
    });
  });

  it('shows "No spend data yet" when providers list is empty', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        today_total_usd: 0,
        mtd_total_usd: 0,
        providers: [],
      }),
    } as Response);

    render(<SpendTab getToken={mockGetToken} />);

    await waitFor(() => {
      expect(screen.getByText(/no spend data yet/i)).toBeInTheDocument();
    });
  });

  it('shows "Loading..." initially before data arrives', () => {
    vi.mocked(global.fetch).mockImplementationOnce(
      () => new Promise(() => {}) // never resolves
    );

    render(<SpendTab getToken={mockGetToken} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message when fetch fails with HTTP 500', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    render(<SpendTab getToken={mockGetToken} />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
    });
  });
});

describe('formatUsd decimal formatting', () => {
  it('shows exactly 2 decimal places for values >= $0.01', async () => {
    // Render a SpendTab with a provider value of 0.040123
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        today_total_usd: 0.040123,
        mtd_total_usd: 0.040123,
        providers: [],
      }),
    } as unknown as Response);

    const mockGetToken = vi.fn().mockResolvedValue('mock-token');
    render(<SpendTab getToken={mockGetToken} />);

    await waitFor(() => {
      // Should show $0.04, not $0.040123 or $0.0401
      expect(screen.getByText('Today: $0.04')).toBeInTheDocument();
    });
  });

  it('preserves sub-cent precision for values < $0.01', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        today_total_usd: 0.000123,
        mtd_total_usd: 0.000123,
        providers: [],
      }),
    } as unknown as Response);

    const mockGetToken = vi.fn().mockResolvedValue('mock-token');
    render(<SpendTab getToken={mockGetToken} />);

    await waitFor(() => {
      expect(screen.getByText('Today: $0.000123')).toBeInTheDocument();
    });
  });
});
