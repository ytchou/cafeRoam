'use client';
import { useEffect, useMemo, useState } from 'react';
import { Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TaxonomyTag } from '@/lib/types';
import { ShopHero } from '@/components/shops/shop-hero';
import { ShopIdentity } from '@/components/shops/shop-identity';
import { AttributeChips } from '@/components/shops/attribute-chips';
import { ShopActionsRow } from '@/components/shops/shop-actions-row';
import { ClaimBanner } from '@/components/shops/claim-banner';
import { ShopDescription } from '@/components/shops/shop-description';
import { MenuHighlights } from '@/components/shops/menu-highlights';
import { RecentCheckinsStrip } from '@/components/shops/recent-checkins-strip';
import { ShopMapThumbnail } from '@/components/shops/shop-map-thumbnail';
import { ShopReviews } from '@/components/shops/shop-reviews';
import { DirectionsSheet } from '@/components/shops/directions-sheet';
import { useShopReviews } from '@/lib/hooks/use-shop-reviews';
import { useUser } from '@/lib/hooks/use-user';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useAnalytics } from '@/lib/posthog/use-analytics';

interface ShopData {
  id: string;
  name: string;
  slug?: string;
  rating?: number | null;
  reviewCount?: number;
  description?: string | null;
  photoUrls?: string[];
  taxonomyTags?: Array<{
    id: string;
    dimension: string;
    label: string;
    labelZh: string;
  }>;
  menuHighlights?: Array<{ name: string; emoji: string; price: string }>;
  latitude?: number;
  longitude?: number;
  openNow?: boolean;
  distance?: string;
  address?: string;
  checkinPreview?: { count: number; previewPhotoUrl: string | null };
  recentCheckins?: Array<{
    id: string;
    displayName: string | null;
    photoUrl: string;
    createdAt: string;
  }>;
}

interface ShopDetailClientProps {
  shop: ShopData;
}

export function ShopDetailClient({ shop }: ShopDetailClientProps) {
  const { capture } = useAnalytics();
  const { user, isLoading: isUserLoading } = useUser();
  const { latitude, longitude, requestLocation } = useGeolocation();
  const router = useRouter();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const photos = shop.photoUrls ?? [];
  const tags = shop.taxonomyTags ?? [];
  const shopPath = `/shops/${shop.id}/${shop.slug ?? shop.id}`;

  const { reviews, total, averageRating, isLoading, isAuthError } =
    useShopReviews(shop.id, !!user);

  useEffect(() => {
    capture('shop_detail_viewed', {
      shop_id: shop.id,
      referrer: document.referrer,
      session_search_query: sessionStorage.getItem('last_search_query'),
    });
  }, [capture, shop.id]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${shopPath}`
      : shopPath;

  const hasMap = shop.latitude != null && shop.longitude != null;

  const directionsShop = useMemo(
    () =>
      hasMap
        ? {
            id: shop.id,
            name: shop.name,
            latitude: shop.latitude!,
            longitude: shop.longitude!,
          }
        : null,
    [hasMap, shop.id, shop.name, shop.latitude, shop.longitude]
  );

  function openDirections() {
    requestLocation();
    setDirectionsOpen(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <ShopHero
        photoUrls={photos}
        shopName={shop.name}
        onBack={() => router.back()}
      />
      <ShopIdentity
        name={shop.name}
        rating={shop.rating}
        reviewCount={shop.reviewCount}
        openNow={shop.openNow}
        distance={shop.distance}
        address={shop.address}
      />
      <ShopActionsRow
        shopId={shop.id}
        shopName={shop.name}
        shareUrl={shareUrl}
      />

      <div className="mx-5 border-t border-[#E5E4E1]" />

      {shop.description && <ShopDescription text={shop.description} />}
      {tags.length > 0 && <AttributeChips tags={tags as TaxonomyTag[]} />}
      {shop.menuHighlights && (
        <MenuHighlights items={shop.menuHighlights} />
      )}

      <div className="mx-5 border-t border-[#E5E4E1]" />

      {hasMap && (
        <div>
          <ShopMapThumbnail
            latitude={shop.latitude!}
            longitude={shop.longitude!}
            shopName={shop.name}
          />
          <div className="px-5 py-3">
            <button
              type="button"
              onClick={openDirections}
              className="flex items-center gap-1.5 rounded-full border border-[#E5E4E1] px-4 py-2 text-sm text-[#3B2F2A] hover:bg-[#F5F4F2]"
              aria-label="Get There"
            >
              <Navigation size={14} />
              Get There
            </button>
          </div>
        </div>
      )}

      <div className="mx-5 border-t border-[#E5E4E1]" />

      <ShopReviews
        reviews={reviews}
        total={total}
        averageRating={averageRating}
        isLoading={isLoading}
        isAuthError={!isUserLoading && (!user || isAuthError)}
        shopId={shop.id}
      />

      {shop.checkinPreview && (
        <RecentCheckinsStrip
          preview={shop.checkinPreview}
          checkins={shop.recentCheckins ?? []}
        />
      )}

      <ClaimBanner shopId={shop.id} />

      {hasMap && directionsShop && (
        <DirectionsSheet
          open={directionsOpen}
          onClose={() => setDirectionsOpen(false)}
          shop={directionsShop}
          userLat={latitude ?? undefined}
          userLng={longitude ?? undefined}
        />
      )}
    </div>
  );
}
