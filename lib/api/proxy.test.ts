import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyToBackend } from './proxy';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('proxyToBackend', () => {
  it('forwards GET request and returns backend response', async () => {
    mockFetch.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = new NextRequest('http://localhost/api/shops');
    const res = await proxyToBackend(req, '/shops');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/shops'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(res.status).toBe(200);
  });

  it('forwards POST request with body', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 201 }));

    const req = new NextRequest('http://localhost/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'My List' }),
    });
    const res = await proxyToBackend(req, '/lists');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/lists'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.status).toBe(201);
  });

  it('does not include body for GET requests', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    const req = new NextRequest('http://localhost/api/shops');
    await proxyToBackend(req, '/shops');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBeUndefined();
  });

  it('skips Authorization header when not present', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    const req = new NextRequest('http://localhost/api/stamps');
    await proxyToBackend(req, '/stamps');

    const [, init] = mockFetch.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});
