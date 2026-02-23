import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 status', async () => {
    const error429 = Object.assign(new Error('Rate limited'), { status: 429 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 529 (Anthropic overloaded) status', async () => {
    const error529 = Object.assign(new Error('Overloaded'), { status: 529 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error529)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 (transient server error)', async () => {
    const error500 = Object.assign(new Error('Internal Server Error'), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error500)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on network errors (no status property)', async () => {
    const networkError = new Error('ECONNRESET');
    // No status property — simulates DNS failure, connection reset, timeout, etc.
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws non-retryable errors immediately', async () => {
    const error400 = Object.assign(new Error('Bad request'), { status: 400 });
    const fn = vi.fn().mockRejectedValue(error400);

    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow('Bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries', async () => {
    const error429 = Object.assign(new Error('Rate limited'), { status: 429 });
    const fn = vi.fn().mockRejectedValue(error429);

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow('Rate limited');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('uses exponential backoff delays', async () => {
    const error429 = Object.assign(new Error('Rate limited'), { status: 429 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValue('ok');

    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(cb, 0); // skip real delays in tests
    }) as typeof setTimeout);

    await withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });

    expect(delays).toEqual([100, 200]); // 100 * 2^0, 100 * 2^1

    vi.restoreAllMocks();
  });
});
