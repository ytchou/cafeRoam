import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/proxy', () => ({
  proxyToBackend: vi.fn(),
}));
import { proxyToBackend } from '@/lib/api/proxy';
const mockProxy = vi.mocked(proxyToBackend);

import { GET } from './route';

describe('GET /api/explore/vibes/[slug]/shops', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to the backend with the slug in the path', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    mockProxy.mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/explore/vibes/study-cave/shops'
    );
    const result = await GET(request, {
      params: Promise.resolve({ slug: 'study-cave' }),
    });

    expect(mockProxy).toHaveBeenCalledWith(
      request,
      '/explore/vibes/study-cave/shops'
    );
    expect(result).toBe(mockResponse);
  });

  it('handles slugs with special characters', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    mockProxy.mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/explore/vibes/late-night-work/shops'
    );
    await GET(request, {
      params: Promise.resolve({ slug: 'late-night-work' }),
    });

    expect(mockProxy).toHaveBeenCalledWith(
      request,
      '/explore/vibes/late-night-work/shops'
    );
  });
});
