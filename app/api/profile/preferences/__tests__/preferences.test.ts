// app/api/profile/preferences/__tests__/preferences.test.ts
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockProxy = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/proxy', () => ({ proxyToBackend: mockProxy }));

describe('/api/profile/preferences proxy routes', () => {
  beforeEach(() => {
    mockProxy.mockReset();
    mockProxy.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it('GET /status proxies to /profile/preferences/status', async () => {
    const { GET } = await import('../status/route');
    const req = new NextRequest(
      'http://localhost/api/profile/preferences/status',
      {
        headers: { Authorization: 'Bearer x' },
      }
    );
    await GET(req);
    expect(mockProxy).toHaveBeenCalledWith(req, '/profile/preferences/status');
  });

  it('POST / proxies to /profile/preferences', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost/api/profile/preferences', {
      method: 'POST',
      headers: { Authorization: 'Bearer x' },
      body: JSON.stringify({ preferredModes: ['work'] }),
    });
    await POST(req);
    expect(mockProxy).toHaveBeenCalledWith(req, '/profile/preferences');
  });

  it('POST /dismiss proxies to /profile/preferences/dismiss', async () => {
    const { POST } = await import('../dismiss/route');
    const req = new NextRequest(
      'http://localhost/api/profile/preferences/dismiss',
      { method: 'POST', headers: { Authorization: 'Bearer x' } }
    );
    await POST(req);
    expect(mockProxy).toHaveBeenCalledWith(req, '/profile/preferences/dismiss');
  });
});
