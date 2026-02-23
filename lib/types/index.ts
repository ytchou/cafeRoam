export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mrt: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string[] | null;
  rating: number | null;
  reviewCount: number;
  priceRange: string | null;
  description: string | null;
  photoUrls: string[];
  menuUrl: string | null;
  taxonomyTags: TaxonomyTag[];
  cafenomadId: string | null;
  googlePlaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxonomyTag {
  id: string;
  dimension: TaxonomyDimension;
  label: string;
  labelZh: string;
}

export type TaxonomyDimension = 'functionality' | 'time' | 'ambience' | 'mode';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  pdpaConsentAt: string;
  createdAt: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  shopIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  shopId: string;
  photoUrls: [string, ...string[]];
  menuPhotoUrl: string | null;
  note: string | null;
  createdAt: string;
}

export interface Stamp {
  id: string;
  userId: string;
  shopId: string;
  checkInId: string;
  designUrl: string;
  earnedAt: string;
}

export interface SearchResult {
  shop: Shop;
  similarityScore: number;
  taxonomyBoost: number;
  totalScore: number;
}

export interface SearchQuery {
  text: string;
  filters?: {
    dimensions?: Partial<Record<TaxonomyDimension, string[]>>;
    nearLatitude?: number;
    nearLongitude?: number;
    radiusKm?: number;
  };
  limit?: number;
}
