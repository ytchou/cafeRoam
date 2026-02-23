// ─── Cafe Nomad API Response ───────────────────────────────────

/** Raw entry from the Cafe Nomad API (v1.2) */
export interface CafeNomadEntry {
  id: string;
  name: string;
  city: string;
  wifi: number;
  seat: number;
  quiet: number;
  tasty: number;
  cheap: number;
  music: number;
  url: string;
  address: string;
  latitude: string;
  longitude: string;
  limited_time: string; // "yes" | "no" | "maybe"
  socket: string; // "yes" | "no" | "maybe"
  standing_desk: string; // "yes" | "no"
  mrt: string;
  open_time: string;
}

// ─── Pass 0: Seed ──────────────────────────────────────────────

/** Cleaned shop from Cafe Nomad after filtering */
export interface Pass0Shop {
  cafenomad_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  social_url: string;
  mrt: string;
  limited_time: string;
  socket: string;
}

// ─── Pass 1: Verified ──────────────────────────────────────────

/** Google Maps result merged with Cafe Nomad seed data */
export interface Pass1Shop {
  cafenomad_id: string;
  google_place_id: string;
  match_confidence: number; // 0.0 - 1.0
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mrt: string;
  limited_time: string;
  socket: string;
  social_url: string;
  // From Google Maps
  google_name: string;
  google_address: string;
  google_latitude: number;
  google_longitude: number;
  rating: number | null;
  review_count: number;
  opening_hours: string[] | null;
  phone: string | null;
  website: string | null;
  categories: string[];
}

/** Unmatched shop for manual review */
export interface UnmatchedShop {
  cafenomad_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  reason:
    | 'no_match'
    | 'permanently_closed'
    | 'temporarily_closed'
    | 'low_confidence';
}

// ─── Pass 2: Full Scrape ───────────────────────────────────────

export interface ReviewData {
  text: string;
  stars: number;
  published_at: string;
  language: string;
}

export interface PhotoData {
  url: string;
  category: string;
  is_menu: boolean;
}

/** Enrichment-ready shop with reviews and photos */
export interface Pass2Shop {
  cafenomad_id: string;
  google_place_id: string;
  match_confidence: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mrt: string;
  rating: number | null;
  review_count: number;
  opening_hours: string[] | null;
  phone: string | null;
  website: string | null;
  categories: string[];
  price_range: string | null;
  description: string | null;
  menu_url: string | null;
  limited_time: string;
  socket: string;
  social_url: string;
  reviews: ReviewData[];
  photos: PhotoData[];
}

// ─── Apify Actor Output Types ──────────────────────────────────

/** Simplified Apify Google Maps Scraper result (compass/crawler-google-places) */
export interface ApifyPlaceResult {
  title: string;
  placeId: string;
  address: string;
  location: { lat: number; lng: number };
  totalScore: number | null;
  reviewsCount: number;
  openingHours: { day: string; hours: string }[] | null;
  phone: string | null;
  website: string | null;
  categoryName: string;
  categories: string[];
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  url: string;
  // Only present in Pass 2 (full scrape)
  reviews?: ApifyReview[];
  imageUrls?: string[];
  price?: string | null;
  description?: string | null;
  menu?: { url: string } | null;
}

export interface ApifyReview {
  text: string | null;
  stars: number;
  publishAt: string;
  language?: string;
}

// ─── Pass 3: Enrichment ────────────────────────────────────────

export interface TaxonomyTag {
  id: string;
  dimension: 'functionality' | 'time' | 'ambience' | 'mode';
  label: string;
  labelZh: string;
}

export interface TaxonomyProposal {
  functionality: Array<{ id: string; label: string; labelZh: string }>;
  time: Array<{ id: string; label: string; labelZh: string }>;
  ambience: Array<{ id: string; label: string; labelZh: string }>;
  mode: Array<{ id: string; label: string; labelZh: string }>;
}

export interface EnrichmentData {
  tags: Array<{ id: string; confidence: number }>;
  summary: string;
  topReviews: string[];
  mode: 'work' | 'rest' | 'social' | 'mixed';
  enrichedAt: string;
  modelId: string;
}

export interface EnrichedShop extends Pass2Shop {
  enrichment: EnrichmentData;
}

// ─── Pass 4: Embeddings ────────────────────────────────────────

export interface ShopEmbedding {
  cafenomad_id: string;
  google_place_id: string;
  name: string;
  embedding: number[];
  embeddedText: string;
  modelId: string;
  embeddedAt: string;
}

// ─── Pass 5: Search Test ───────────────────────────────────────

export interface SearchQuery {
  id: string;
  query: string;
  category: 'attribute' | 'vibe' | 'specific' | 'mixed' | 'mode';
  expectedTraits: string[];
}

export interface SearchTestResult {
  query: string;
  category: string;
  results: Array<{
    rank: number;
    name: string;
    score: number;
    boostedScore: number;
    matchedTags: string[];
  }>;
}
