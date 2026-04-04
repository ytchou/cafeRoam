export interface District {
  id: string;
  slug: string;
  nameEn: string;
  nameZh: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  city: string;
  shopCount: number;
  sortOrder: number;
}

export interface DistrictShopResult {
  shopId: string;
  name: string;
  slug: string | null;
  rating: number | null;
  reviewCount: number;
  coverPhotoUrl: string | null;
  address: string | null;
  mrt: string | null;
  matchedTagLabels: string[];
}

export interface DistrictShopsResponse {
  district: District;
  shops: DistrictShopResult[];
  totalCount: number;
}
