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

describe('GET /api/health', () => {
  it('health check endpoint requests backend health status', async () => {
    mockFetch.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const request = new NextRequest('http://localhost/api/health');

    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('health check endpoint returns backend status when healthy', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"status":"ok"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('{"status":"ok"}');
  });

  it('health check endpoint returns backend errors unchanged', async () => {
    mockFetch.mockResolvedValue(
      new Response('Service unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      })
    );

    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe('Service unavailable');
  });
});
