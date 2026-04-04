import type { MetadataRoute } from 'next';
import { createAnonClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAnonClient();

  const [
    { data: shops, error: shopsError },
    { data: vibes, error: vibesError },
    { data: districts, error: districtsError },
  ] = await Promise.all([
    supabase
      .from('shops')
      .select('id, slug, updated_at')
      .eq('processing_status', 'live')
      .limit(5000),
    supabase.from('vibe_collections').select('slug'),
    supabase.from('districts').select('slug').eq('is_active', true),
  ]);

  if (shopsError) {
    console.error('[sitemap] Failed to fetch shops:', shopsError.message);
  }
  if (vibesError) {
    console.error('[sitemap] Failed to fetch vibes:', vibesError.message);
  }
  if (districtsError) {
    console.error(
      '[sitemap] Failed to fetch districts:',
      districtsError.message
    );
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

  const districtEntries: MetadataRoute.Sitemap = (districts ?? []).map((d) => ({
    url: `${BASE_URL}/explore/districts/${d.slug}`,
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
    {
      url: `${BASE_URL}/explore/community`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  return [...staticPages, ...vibeEntries, ...districtEntries, ...shopEntries];
}
