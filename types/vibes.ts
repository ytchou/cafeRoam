export interface VibeCollection {
  id: string;
  slug: string;
  name: string;
  nameZh: string;
  emoji: string | null;
  subtitle: string | null;
  subtitleZh: string | null;
  tagIds: string[];
  sortOrder: number;
}

export interface VibeShopResult {
  shopId: string;
  name: string;
  slug: string | null;
  rating: number | null;
  reviewCount: number;
  coverPhotoUrl: string | null;
  distanceKm: number | null;
  overlapScore: number;
  matchedTagLabels: string[];
  latitude: number | null;
  longitude: number | null;
}

export interface VibeShopsResponse {
  vibe: VibeCollection;
  shops: VibeShopResult[];
  totalCount: number;
}
