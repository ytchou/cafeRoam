import { fetchPublic } from '@/lib/api/fetch';
import type { VibeCollection, VibeShopsResponse } from '@/types/vibes';

export async function fetchVibes(): Promise<VibeCollection[]> {
  return fetchPublic<VibeCollection[]>('/api/explore/vibes');
}

export function buildVibeShopsUrl(
  slug: string,
  lat?: number | null,
  lng?: number | null,
  radiusKm = 5
): string {
  const params = new URLSearchParams();
  if (lat != null) params.set('lat', String(lat));
  if (lng != null) params.set('lng', String(lng));
  params.set('radius_km', String(radiusKm));
  return `/api/explore/vibes/${slug}/shops?${params}`;
}

export async function fetchVibeShops(
  slug: string,
  lat?: number | null,
  lng?: number | null
): Promise<VibeShopsResponse> {
  return fetchPublic<VibeShopsResponse>(buildVibeShopsUrl(slug, lat, lng));
}
