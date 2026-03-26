export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
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
  updatedAt?: string;
  slug?: string;
  communitySummary?: string | null;
  modeWork?: number | null;
  modeRest?: number | null;
  modeSocial?: number | null;
}

export interface ShopDetail extends Shop {
  modeScores?: {
    work: number;
    rest: number;
    social: number;
  };
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

export interface ListItem {
  shop_id: string;
  added_at: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  items: ListItem[];
  created_at: string;
  updated_at: string;
}

export interface ListPin {
  list_id: string;
  shop_id: string;
  lat: number;
  lng: number;
}

export interface CheckIn {
  id: string;
  userId: string;
  shopId: string;
  photoUrls: [string, ...string[]];
  menuPhotoUrl: string | null;
  note: string | null;
  stars: number | null;
  reviewText: string | null;
  confirmedTags: string[] | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ShopReview {
  id: string;
  user_id: string;
  display_name: string | null;
  stars: number;
  review_text: string | null;
  confirmed_tags: string[] | null;
  reviewed_at: string;
}

export interface ShopReviewsResponse {
  reviews: ShopReview[];
  total_count: number;
  average_rating: number;
}

export interface Stamp {
  id: string;
  userId: string;
  shopId: string;
  checkInId: string;
  designUrl: string;
  earnedAt: string;
  shopName: string | null;
}

export interface SearchResult {
  shop: Shop;
  similarityScore: number;
  taxonomyBoost: number;
  totalScore: number;
}

// Shared view types for map/list layout components
export interface LayoutShop {
  id: string;
  name: string;
  rating: number | null;
  photo_urls?: string[];
  photoUrls?: string[];
  distance_m?: number | null;
  is_open?: boolean | null;
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
  review_count?: number;
  reviewCount?: number;
}

export interface MappableLayoutShop extends LayoutShop {
  latitude: number | null;
  longitude: number | null;
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

export interface FollowResponse {
  following: boolean;
  followerCount: number;
}

export interface FollowerCountResponse {
  count: number;
  visible: boolean;
  isFollowing: boolean | null;
}

export interface FollowedShop {
  id: string;
  name: string;
  address: string;
  slug: string | null;
  mrt: string | null;
  followedAt: string;
}

export interface FollowingListResponse {
  shops: FollowedShop[];
  total: number;
  page: number;
}
