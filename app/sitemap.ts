import type { MetadataRoute } from 'next';
import { createAnonClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://caferoam.tw';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAnonClient();

  const [{ data: shops, error: shopsError }, { data: vibes, error: vibesError }] =
    await Promise.all([
      supabase
        .from('shops')
        .select('id, slug, updated_at')
        .eq('processing_status', 'live')
        .limit(5000),
      supabase.from('vibe_collections').select('slug'),
    ]);

  if (shopsError) {
    console.error('[sitemap] Failed to fetch shops:', shopsError.message);
  }
  if (vibesError) {
    console.error('[sitemap] Failed to fetch vibes:', vibesError.message);
  }

  const shopEntries: MetadataRoute.Sitemap = (shops ?? []).map((shop) => ({
    url: `${BASE_URL}/shops/${shop.id}/${shop.slug ?? shop.id}`,
    lastModified: shop.updated_at ? new Date(shop.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const vibeEntries: MetadataRoute.Sitemap = (vibes ?? []).map((vibe) => ({
    url: `${BASE_URL}/explore/vibes/${vibe.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ];

  return [...staticPages, ...vibeEntries, ...shopEntries];
}
