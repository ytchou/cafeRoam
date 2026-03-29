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

const SHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const MISSING_ID = '00000000-0000-0000-0000-000000000000';
const SLUGLESS_ID = 'c9a4f3e1-8b7d-4c5a-9e2f-1a3b5d7c9e0f';

describe('app/shops/[shopId]/page — redirect route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a user navigating to a shop by ID is redirected to the full canonical URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: SHOP_ID, slug: 'hoto-cafe', name: '禾多咖啡' }),
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: SHOP_ID }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith(`/shops/${SHOP_ID}/hoto-cafe`);
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('a user navigating to a non-existent shop ID sees a 404 page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: MISSING_ID }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('a user navigating to a shop without a slug is redirected using the shop ID as the path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: SLUGLESS_ID, name: '無名咖啡' }),
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: SLUGLESS_ID }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith(
      `/shops/${SLUGLESS_ID}/${SLUGLESS_ID}`
    );
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('a user navigating to a shop when the backend is unavailable sees an error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(
      ShopRedirectPage({ params: Promise.resolve({ shopId: SHOP_ID }) })
    ).rejects.toThrow('Failed to fetch shop: 503');

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
