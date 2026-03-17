import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/proxy', () => ({
  proxyToBackend: vi.fn(),
}));
import { proxyToBackend } from '@/lib/api/proxy';
const mockProxy = vi.mocked(proxyToBackend);

import { GET } from './route';

describe('GET /api/explore/vibes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to the backend /explore/vibes path', async () => {
    const mockResponse = new Response('[]', { status: 200 });
    mockProxy.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/explore/vibes');
    const result = await GET(request);

    expect(mockProxy).toHaveBeenCalledWith(request, '/explore/vibes');
    expect(result).toBe(mockResponse);
  });
});
