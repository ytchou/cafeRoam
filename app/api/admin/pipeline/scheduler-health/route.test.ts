import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe('admin can check if the scheduler is healthy', () => {
  it('forwards the request to the scheduler health backend path', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/admin/pipeline/scheduler-health?verbose=true',
      { method: 'GET' }
    );

    await GET(request);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toContain('/health/scheduler');
  });

  it('passes through a healthy backend response unchanged', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'healthy' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/admin/pipeline/scheduler-health',
      { method: 'GET' }
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'healthy' });
  });

  it('passes through a scheduler down response unchanged', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Scheduler unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/admin/pipeline/scheduler-health',
      { method: 'GET' }
    );

    const response = await GET(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: 'Scheduler unavailable',
    });
  });
});
