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
import { OwnerStory } from '@/components/shops/owner-story';
import { VerifiedBadge } from '@/components/shops/verified-badge';
import { ShopDescription } from '@/components/shops/shop-description';
import { MenuHighlights } from '@/components/shops/menu-highlights';
import { RecentCheckinsStrip } from '@/components/shops/recent-checkins-strip';
import { ShopMapThumbnail } from '@/components/shops/shop-map-thumbnail';
import { ShopReviews } from '@/components/shops/shop-reviews';
import { CommunitySummary } from '@/components/shops/community-summary';
import { DirectionsSheet } from '@/components/shops/directions-sheet';
import { useShopReviews } from '@/lib/hooks/use-shop-reviews';
import { useUser } from '@/lib/hooks/use-user';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useSearchParams } from 'next/navigation';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { trackShopDetailView } from '@/lib/analytics/ga4-events';

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
  communitySummary?: string | null;
  checkinPreview?: { count: number; previewPhotoUrl: string | null };
  recentCheckins?: Array<{
    id: string;
    displayName: string | null;
    photoUrl: string;
    createdAt: string;
  }>;
  claimStatus?: 'pending' | 'approved' | 'rejected' | null;
  ownerId?: string | null;
  ownerStory?: {
    id: string;
    title: string | null;
    body: string;
    photo_url: string | null;
    is_published: boolean;
    updated_at: string;
  } | null;
}

interface ShopDetailClientProps {
  shop: ShopData;
}

export function ShopDetailClient({ shop }: ShopDetailClientProps) {
  const { capture } = useAnalytics();
  const searchParams = useSearchParams();
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
      referrer: searchParams.get('ref') ?? 'direct',
      session_search_query: searchParams.get('q') ?? null,
    });
    trackShopDetailView(shop.id);
    // searchParams intentionally excluded: only track on initial shop load,
    // not on subsequent query-string changes within the same shop page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {shop.claimStatus === 'approved' && <VerifiedBadge />}
      <ShopActionsRow
        shopId={shop.id}
        shopName={shop.name}
        shareUrl={shareUrl}
      />

      <div className="border-border-warm mx-5 border-t" />

      {shop.description && <ShopDescription text={shop.description} />}
      <OwnerStory
        story={shop.ownerStory ?? null}
        shopId={shop.id}
        isOwner={user?.id === shop.ownerId}
      />
      {tags.length > 0 && <AttributeChips tags={tags as TaxonomyTag[]} />}
      {shop.menuHighlights && <MenuHighlights items={shop.menuHighlights} />}

      <div className="border-border-warm mx-5 border-t" />

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
              className="border-border-warm text-text-body hover:bg-surface-section flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm"
              aria-label="Get There"
            >
              <Navigation size={14} />
              Get There
            </button>
          </div>
        </div>
      )}

      <div className="border-border-warm mx-5 border-t" />

      <CommunitySummary summary={shop.communitySummary ?? null} />
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

      <ClaimBanner
        shopId={shop.id}
        shopName={shop.name}
        claimStatus={shop.claimStatus ?? null}
      />

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
