import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase v2: await the chain directly (no .execute()).
// Two separate query chains: shops (select→eq→limit) and vibes (select only).
const mockShopsExecute = vi.hoisted(() => vi.fn());
const mockVibesExecute = vi.hoisted(() => vi.fn());
const mockFromFn = vi.hoisted(() =>
  vi.fn((table: string) => {
    if (table === 'vibe_collections') {
      return { select: vi.fn(() => mockVibesExecute()) };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => mockShopsExecute()),
        })),
      })),
    };
  })
);

vi.mock('@/lib/supabase/server', () => ({
  createAnonClient: vi.fn(() => ({ from: mockFromFn })),
}));

describe('sitemap generation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('when the sitemap is requested, it includes static pages, vibe pages, and all live shop URLs', async () => {
    mockShopsExecute.mockResolvedValue({
      data: [
        {
          id: 'shop-1',
          slug: 'cafe-flaneur',
          updated_at: '2026-03-20T14:30:00Z',
        },
        {
          id: 'shop-2',
          slug: 'beans-and-leaves',
          updated_at: '2026-03-18T10:00:00Z',
        },
      ],
      error: null,
    });
    mockVibesExecute.mockResolvedValue({
      data: [{ slug: 'quiet-corner' }, { slug: 'deep-work' }],
      error: null,
    });

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();
    const urls = entries.map((e: { url: string }) => e.url);

    // Static pages
    expect(urls).toContain('https://caferoam.tw');
    expect(urls).toContain('https://caferoam.tw/explore');

    // Vibe pages
    expect(urls).toContain('https://caferoam.tw/explore/vibes/quiet-corner');
    expect(urls).toContain('https://caferoam.tw/explore/vibes/deep-work');

    // Shop pages
    expect(urls).toContain('https://caferoam.tw/shops/shop-1/cafe-flaneur');
    expect(urls).toContain('https://caferoam.tw/shops/shop-2/beans-and-leaves');

    // 2 static + 2 vibes + 2 shops
    expect(entries.length).toBeGreaterThanOrEqual(6);
  });

  it('when the shops query fails, the sitemap logs the error and returns static pages only', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockShopsExecute.mockResolvedValue({
      data: null,
      error: { message: 'connection timeout' },
    });
    mockVibesExecute.mockResolvedValue({ data: [], error: null });

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();
    const urls = entries.map((e: { url: string }) => e.url);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[sitemap] Failed to fetch shops:',
      'connection timeout'
    );
    expect(urls).toContain('https://caferoam.tw');
    expect(urls).not.toContain('https://caferoam.tw/shops/shop-1/cafe-flaneur');
    consoleSpy.mockRestore();
  });
});
