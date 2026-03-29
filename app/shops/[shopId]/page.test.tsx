import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation before any imports that use it
const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// Mock fetch at the global boundary
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import ShopRedirectPage from './page';

describe('app/shops/[shopId]/page — redirect route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /shops/[shopId]/[slug] when shop exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'shop-abc', slug: 'hoto-cafe', name: 'Hoto Cafe' }),
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: 'shop-abc' }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/shops/shop-abc/hoto-cafe');
  });

  it('calls notFound when shop does not exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: 'nonexistent' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  it('falls back to shopId as slug when shop has no slug field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'shop-xyz', name: 'No Slug Cafe' }),
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: 'shop-xyz' }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/shops/shop-xyz/shop-xyz');
  });
});
