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
    districtIds?: string[] | null;
  }
): string {
  const params = new URLSearchParams();
  if (options?.lat != null && options?.lng != null) {
    params.set('lat', String(options.lat));
    params.set('lng', String(options.lng));
    params.set('radius_km', String(options?.radiusKm ?? 5));
  }
  const base = `/api/explore/vibes/${slug}/shops`;
  const parts: string[] = [];
  const qs = params.toString();
  if (qs) {
    parts.push(qs);
  }
  if (options?.districtIds && options.districtIds.length > 0) {
    parts.push(`district_ids=${options.districtIds.slice().sort().join(',')}`);
  }

  return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
}

export async function fetchVibeShops(
  slug: string,
  lat?: number | null,
  lng?: number | null
): Promise<VibeShopsResponse> {
  return fetchPublic<VibeShopsResponse>(buildVibeShopsUrl(slug, { lat, lng }));
}
