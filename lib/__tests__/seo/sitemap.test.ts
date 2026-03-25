import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase v2: the chain is awaited directly (no .execute()).
// mockLimit must return a thenable so `await limit(5000)` resolves correctly.
const mockExecute = vi.hoisted(() => vi.fn());
const mockLimit = vi.hoisted(() => vi.fn(() => mockExecute()));
const mockEq = vi.hoisted(() => vi.fn(() => ({ limit: mockLimit })));
const mockSelect = vi.hoisted(() => vi.fn(() => ({ eq: mockEq })));
const mockTable = vi.hoisted(() => vi.fn(() => ({ select: mockSelect })));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockTable,
  })),
}));

describe('sitemap generation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('generates sitemap entries for all live shops plus static pages', async () => {
    mockExecute.mockResolvedValue({
      data: [
        { id: 'shop-1', slug: 'cafe-flaneur', updated_at: '2026-03-20T14:30:00Z' },
        { id: 'shop-2', slug: 'beans-and-leaves', updated_at: '2026-03-18T10:00:00Z' },
      ],
    });

    // Dynamic import after mocks are set up
    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    // Static pages
    const urls = entries.map((e: { url: string }) => e.url);
    expect(urls).toContain('https://caferoam.tw');
    expect(urls).toContain('https://caferoam.tw/explore');

    // Shop pages
    expect(urls).toContain('https://caferoam.tw/shops/shop-1/cafe-flaneur');
    expect(urls).toContain('https://caferoam.tw/shops/shop-2/beans-and-leaves');

    // Total: 2 static + 2 shops
    expect(entries.length).toBeGreaterThanOrEqual(4);
  });
});
