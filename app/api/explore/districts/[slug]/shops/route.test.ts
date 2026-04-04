import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/proxy', () => ({
  proxyToBackend: vi.fn(),
}));
import { proxyToBackend } from '@/lib/api/proxy';
const mockProxy = vi.mocked(proxyToBackend);

import { GET } from './route';

describe('GET /api/explore/districts/[slug]/shops', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to the backend with the slug in the path', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    mockProxy.mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/explore/districts/da-an/shops'
    );
    const result = await GET(request, {
      params: Promise.resolve({ slug: 'da-an' }),
    });

    expect(mockProxy).toHaveBeenCalledWith(
      request,
      '/explore/districts/da-an/shops'
    );
    expect(result).toBe(mockResponse);
  });

  it('handles multi-word district slugs', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    mockProxy.mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/explore/districts/zhong-shan/shops'
    );
    await GET(request, {
      params: Promise.resolve({ slug: 'zhong-shan' }),
    });

    expect(mockProxy).toHaveBeenCalledWith(
      request,
      '/explore/districts/zhong-shan/shops'
    );
  });
});
