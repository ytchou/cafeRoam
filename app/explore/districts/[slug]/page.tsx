import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Star, MapPin } from 'lucide-react';

import { DistrictJsonLd } from '@/components/seo/DistrictJsonLd';
import { fetchDistrictShops } from '@/lib/api/districts';

interface Params {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchDistrictShops(slug);
  if (!data) return { title: 'District not found' };

  const { district } = data;
  const title = `${district.nameZh}咖啡廳推薦 | ${district.nameEn} Cafes — 啡遊`;
  const description =
    district.descriptionEn ??
    `Discover ${district.shopCount} independent coffee shops in ${district.nameEn}, Taipei.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function DistrictPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ vibe?: string }>;
}) {
  const { slug } = await params;
  const { vibe } = await searchParams;
  const data = await fetchDistrictShops(slug, vibe);

  if (!data) {
    notFound();
  }

  const { district, shops, totalCount } = data;

  return (
    <>
      <DistrictJsonLd district={district} />
      <main className="bg-surface-warm min-h-screen px-5 pt-6 pb-24">
        {/* Header */}
        <div className="mb-5">
          <Link
            href="/explore/districts"
            className="text-link-green mb-2 inline-block text-xs font-medium"
          >
            All Districts
          </Link>
          <h1
            className="text-text-primary text-xl font-bold"
            style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}
          >
            {district.nameZh}
          </h1>
          <p className="text-xs text-gray-400">{district.nameEn}</p>
          {district.descriptionZh && (
            <p className="mt-2 text-sm text-gray-500">
              {district.descriptionZh}
            </p>
          )}
          <div className="mt-3">
            <span className="bg-link-green inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white">
              {totalCount} {totalCount === 1 ? 'shop' : 'shops'}
            </span>
          </div>
        </div>

        {/* Shop list */}
        {shops.length === 0 ? (
          <div className="rounded-xl bg-white/60 px-6 py-10 text-center">
            <p className="text-sm text-gray-500">
              No shops found in this district.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
            {shops.map((shop) => (
              <li key={shop.shopId}>
                <Link
                  href={`/shops/${shop.slug ?? shop.shopId}`}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
                >
                  {shop.coverPhotoUrl ? (
                    <Image
                      src={shop.coverPhotoUrl}
                      alt={shop.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary truncate text-sm font-semibold">
                      {shop.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      {shop.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="fill-rating-star text-rating-star h-3 w-3" />
                          {shop.rating}
                        </span>
                      )}
                      {shop.mrt && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {shop.mrt}
                        </span>
                      )}
                    </div>
                    {shop.matchedTagLabels.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {shop.matchedTagLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-400"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
