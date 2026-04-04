import { BACKEND_URL } from '@/lib/api/proxy';
import type { District, DistrictShopsResponse } from '@/types/districts';

export async function fetchDistricts(): Promise<District[]> {
  const res = await fetch(`${BACKEND_URL}/explore/districts`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch districts: ${res.status}`);
  return res.json();
}

export async function fetchDistrictShops(
  slug: string,
  vibeSlug?: string
): Promise<DistrictShopsResponse | null> {
  const params = vibeSlug ? `?vibe=${encodeURIComponent(vibeSlug)}` : '';
  const res = await fetch(
    `${BACKEND_URL}/explore/districts/${slug}/shops${params}`,
    { next: { revalidate: 300 } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch district shops: ${res.status}`);
  return res.json();
}
