// app/api/analytics/events/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockProxyToBackend = vi.fn();
vi.mock('@/lib/api/proxy', () => ({
  proxyToBackend: mockProxyToBackend,
}));

describe('POST /api/analytics/events', () => {
  beforeEach(() => {
    mockProxyToBackend.mockReset();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    );
  });

  it('proxies to backend /analytics/events', async () => {
    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'filter_applied',
        properties: { filter_type: 'sheet', filter_value: ['wifi'] },
      }),
    });

    await POST(request);
    expect(mockProxyToBackend).toHaveBeenCalledWith(
      request,
      '/analytics/events'
    );
  });
});
