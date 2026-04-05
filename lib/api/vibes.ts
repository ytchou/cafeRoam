import { fetchPublic } from '@/lib/api/fetch';
import type { VibeCollection, VibeShopsResponse } from '@/types/vibes';

export async function fetchVibes(): Promise<VibeCollection[]> {
  return fetchPublic<VibeCollection[]>('/api/explore/vibes');
}

export function buildVibeShopsUrl(
  slug: string,
  options?: {
    lat?: number | null;
    lng?: number | null;
    radiusKm?: number;
    districtId?: string | null;
  }
): string {
  const params = new URLSearchParams();
  if (options?.lat != null && options?.lng != null) {
    params.set('lat', String(options.lat));
    params.set('lng', String(options.lng));
    params.set('radius_km', String(options?.radiusKm ?? 5));
  }
  if (options?.districtId) {
    params.set('district_id', options.districtId);
  }
  const qs = params.toString();
  return `/api/explore/vibes/${slug}/shops${qs ? `?${qs}` : ''}`;
}

export async function fetchVibeShops(
  slug: string,
  lat?: number | null,
  lng?: number | null
): Promise<VibeShopsResponse> {
  return fetchPublic<VibeShopsResponse>(buildVibeShopsUrl(slug, { lat, lng }));
}
