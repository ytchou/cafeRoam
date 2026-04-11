'use client';
import { useEffect, useMemo } from 'react';
import { Navigation, Globe, MapPin } from 'lucide-react';
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

const SOCIAL_DOMAINS = new Set([
  'instagram.com', 'www.instagram.com', 'instagr.am',
  'facebook.com', 'fb.com', 'm.facebook.com', 'www.facebook.com', 'fb.me',
  'threads.net', 'www.threads.net',
])

function isSocialUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return SOCIAL_DOMAINS.has(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 192 192" fill="currentColor" className={className} aria-hidden="true">
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.035l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.502 7.13 2.932 3.405 4.893 8.11 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C57.044 25.425 74.295 18.11 97.104 17.942c22.976.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 10.606 125.202 1.195 97.27 1.001h-.253C69.32 1.195 47.842 10.637 33.663 28.37 21.079 44.246 14.619 66.6 14.396 96c.223 29.4 6.683 51.755 19.267 67.63 14.179 17.732 35.657 27.175 62.884 27.369h.253c24.586-.169 41.702-6.686 55.821-21.07 18.683-18.942 18.136-42.637 11.996-57.14-4.231-9.856-12.36-17.96-22.08-23.801Zm-38.653 34.237c-10.426.583-21.24-4.098-21.82-14.135-.426-7.975 5.658-16.867 24.033-17.94 2.102-.122 4.168-.179 6.199-.179 6.5 0 12.59.638 18.166 1.882-2.067 25.928-16.793 29.855-26.578 30.372Z"/>
    </svg>
  )
}

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
  website?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  threadsUrl?: string | null;
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
            name: shop.name,
            latitude: shop.latitude!,
            longitude: shop.longitude!,
          })
        : null,
    [hasMap, shop.name, shop.latitude, shop.longitude]
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

        {/* Social Links + Google Maps */}
        {(shop.instagramUrl || shop.facebookUrl || shop.threadsUrl || shop.website || shop.googlePlaceId || (shop.latitude != null && shop.longitude != null)) && (
          <div className="border-t border-border-warm pt-4 pb-2 mx-5">
            <div className="flex items-center gap-1">
              {(shop.googlePlaceId || (shop.latitude != null && shop.longitude != null)) && (
                <a
                  href={getGoogleMapsUrl({
                    name: shop.name,
                    latitude: shop.latitude ?? 0,
                    longitude: shop.longitude ?? 0,
                    googlePlaceId: shop.googlePlaceId ?? null,
                    address: shop.address ?? null,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="在 Google Maps 查看"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MapPin className="h-5 w-5" />
                </a>
              )}

              {shop.instagramUrl && (
                <a
                  href={shop.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
              )}

              {shop.facebookUrl && (
                <a
                  href={shop.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FacebookIcon className="h-5 w-5" />
                </a>
              )}

              {shop.threadsUrl && (
                <a
                  href={shop.threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Threads"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ThreadsIcon className="h-5 w-5" />
                </a>
              )}

              {shop.website && !isSocialUrl(shop.website) && (
                <a
                  href={shop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="官方網站"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        )}

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
