import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JobLogsPanel } from './JobLogsPanel';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeLog(
  overrides: Partial<{
    id: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context: Record<string, unknown>;
    created_at: string;
  }> = {}
) {
  return {
    id: 'log-1',
    level: 'info' as const,
    message: 'job.start',
    context: {},
    created_at: '2026-04-10T00:00:00Z',
    ...overrides,
  };
}

describe('JobLogsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders log lines with correct level colors', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          logs: [
            makeLog({ id: '1', level: 'info', message: 'job.start', created_at: '2026-04-10T00:00:00Z' }),
            makeLog({ id: '2', level: 'warn', message: 'job.aborted_midflight', created_at: '2026-04-10T00:00:01Z' }),
            makeLog({ id: '3', level: 'error', message: 'job.error', context: { error: 'timeout' }, created_at: '2026-04-10T00:00:02Z' }),
          ],
          job_status: 'failed',
        }),
    });

    render(<JobLogsPanel jobId="job-1" />);

    await screen.findByText('job.start');
    expect(screen.getByText('job.aborted_midflight')).toBeInTheDocument();
    expect(screen.getByText('job.error')).toBeInTheDocument();
  });

  it('stops polling when job reaches terminal status', async () => {
    vi.useFakeTimers();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: [], job_status: 'claimed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: [], job_status: 'claimed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: [], job_status: 'completed' }),
      });

    render(<JobLogsPanel jobId="job-terminal" pollInterval={3000} />);

    // Initial fetch fires immediately
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance 3s — second fetch
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Advance 3s — third fetch returns terminal status
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const countAfterTerminal = mockFetch.mock.calls.length;

    // Advance another 3s — polling should be stopped
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(countAfterTerminal);

    vi.useRealTimers();
  });

  it('passes after_ts for incremental fetches', async () => {
    vi.useFakeTimers();

    const firstLog = makeLog({
      id: 'log-a1b2',
      level: 'info',
      message: 'job.processing',
      created_at: '2026-04-10T00:00:01Z',
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            logs: [firstLog],
            job_status: 'claimed',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: [], job_status: 'claimed' }),
      });

    render(<JobLogsPanel jobId="job-incremental" pollInterval={3000} />);

    // Initial fetch (no after_ts)
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).not.toContain('after_ts');

    // Advance 3s — second fetch should include after_ts
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondUrl).toContain('after_ts=2026-04-10T00%3A00%3A01Z');

    vi.useRealTimers();
  });
});
