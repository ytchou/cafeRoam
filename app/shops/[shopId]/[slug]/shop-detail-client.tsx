'use client';
import { useEffect, useMemo } from 'react';
import { Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { TaxonomyTag } from '@/lib/types';
import { getGoogleMapsUrl, getAppleMapsUrl } from '@/lib/utils/maps';
import { ShopHero } from '@/components/shops/shop-hero';
import { ShopIdentity } from '@/components/shops/shop-identity';
import { AttributeChips } from '@/components/shops/attribute-chips';
import { ShopActionsRow } from '@/components/shops/shop-actions-row';
import { ClaimBanner } from '@/components/shops/claim-banner';
import { OwnerStory } from '@/components/shops/owner-story';
import { VerifiedBadge } from '@/components/shops/verified-badge';
import { ShopDescription } from '@/components/shops/shop-description';
import { MenuHighlights } from '@/components/shops/menu-highlights';
import { PaymentMethodSection } from '@/components/shops/payment-method-section';
import { RecentCheckinsStrip } from '@/components/shops/recent-checkins-strip';
import { ShopMapThumbnail } from '@/components/shops/shop-map-thumbnail';
import { ShopReviews } from '@/components/shops/shop-reviews';
import { CommunitySummary } from '@/components/shops/community-summary';
import { useShopReviews } from '@/lib/hooks/use-shop-reviews';
import { useUser } from '@/lib/hooks/use-user';
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
  address?: string | null;
  communitySummary?: string | null;
  paymentMethods?: Record<string, boolean | null>;
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
  district?: { slug: string; nameZh: string } | null;
  googlePlaceId?: string | null;
}

interface ShopDetailClientProps {
  shop: ShopData;
}

export function ShopDetailClient({ shop }: ShopDetailClientProps) {
  const { capture } = useAnalytics();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const router = useRouter();
  const photos = shop.photoUrls ?? [];
  const tags = shop.taxonomyTags ?? [];
  const shopPath = `/shops/${shop.id}/${shop.slug ?? shop.id}`;

  const { reviews, totalCount, averageRating, isLoading } = useShopReviews(
    shop.id
  );

  // TODO: Wire SWR fetch to GET /api/shops/{shopId}/payment-methods for live
  // confirmation counts and user votes instead of hardcoded 0/null.
  const paymentMethods = useMemo(
    () =>
      Object.entries(shop.paymentMethods ?? {})
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([method, accepted]) => ({
          method,
          accepted: Boolean(accepted),
          confirmationCount: 0,
          userVote: null as boolean | null,
        })),
    [shop.paymentMethods]
  );

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

  const googleMapsUrl = useMemo(
    () =>
      hasMap
        ? getGoogleMapsUrl({
            name: shop.name,
            latitude: shop.latitude!,
            longitude: shop.longitude!,
            googlePlaceId: shop.googlePlaceId ?? null,
            address: shop.address ?? null,
          })
        : null,
    [
      hasMap,
      shop.name,
      shop.latitude,
      shop.longitude,
      shop.googlePlaceId,
      shop.address,
    ]
  );

  const appleMapsUrl = useMemo(
    () =>
      hasMap
        ? getAppleMapsUrl({
            latitude: shop.latitude!,
            longitude: shop.longitude!,
            address: shop.address ?? null,
          })
        : null,
    [hasMap, shop.latitude, shop.longitude, shop.address]
  );

  const navigationLinks =
    googleMapsUrl && appleMapsUrl ? (
      <>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border-warm text-text-body hover:bg-surface-section flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm"
        >
          <Navigation size={14} />
          Google Maps
        </a>
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border-warm text-text-body hover:bg-surface-section flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm"
        >
          <Navigation size={14} />
          Apple Maps
        </a>
      </>
    ) : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero — full width, taller on desktop */}
      <ShopHero
        photoUrls={photos}
        shopName={shop.name}
        onBack={() => router.back()}
        className="lg:h-[480px]"
      />

      {/* Shop info */}
      <div>
        <ShopIdentity
          name={shop.name}
          rating={shop.rating}
          reviewCount={shop.reviewCount}
          openNow={shop.openNow}
          distance={shop.distance}
          address={shop.address ?? undefined}
        />
        {shop.claimStatus === 'approved' && <VerifiedBadge />}
        <ShopActionsRow
          shopId={shop.id}
          shopName={shop.name}
          shareUrl={shareUrl}
        />

        {/* Inline directions — desktop only */}
        {hasMap && (
          <div className="hidden gap-2 lg:flex">{navigationLinks}</div>
        )}

        <div className="border-border-warm mx-5 border-t" />

        {shop.description && <ShopDescription text={shop.description} />}
        <OwnerStory
          story={shop.ownerStory ?? null}
          shopId={shop.id}
          isOwner={user?.id === shop.ownerId}
        />
        {tags.length > 0 && <AttributeChips tags={tags as TaxonomyTag[]} />}
        {shop.menuHighlights && <MenuHighlights items={shop.menuHighlights} />}
        {paymentMethods.length > 0 && (
          <>
            <PaymentMethodSection methods={paymentMethods} />
            <div className="border-border-warm mx-5 border-t" />
          </>
        )}

        <div className="border-border-warm mx-5 border-t" />

        {hasMap && (
          <div>
            <div className="px-5 py-4">
              <h2 className="text-text-primary mb-2 text-sm font-semibold">
                Location
              </h2>
            </div>
            <ShopMapThumbnail
              latitude={shop.latitude!}
              longitude={shop.longitude!}
              shopName={shop.name}
            />
            <div className="flex gap-2 px-5 py-3 lg:hidden">
              {navigationLinks}
            </div>
          </div>
        )}

        <div className="border-border-warm mx-5 border-t" />

        <CommunitySummary summary={shop.communitySummary ?? null} />
        <ShopReviews
          reviews={reviews}
          totalCount={totalCount}
          averageRating={averageRating}
          isLoading={isLoading}
          shopId={shop.id}
        />

        {shop.checkinPreview && (
          <RecentCheckinsStrip
            preview={shop.checkinPreview}
            checkins={shop.recentCheckins ?? []}
          />
        )}

        {shop.district && (
          <div className="px-5 py-4">
            <Link
              href={`/explore/districts/${shop.district.slug}`}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-sm font-medium text-gray-700">
                More cafes in {shop.district.nameZh}
              </span>
              <span className="text-link-green text-xs font-medium">
                See all &rarr;
              </span>
            </Link>
          </div>
        )}
        <ClaimBanner
          shopId={shop.id}
          shopName={shop.name}
          claimStatus={shop.claimStatus ?? null}
        />
      </div>
    </div>
  );
}
