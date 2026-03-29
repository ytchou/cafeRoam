import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ShopDetailClient } from './shop-detail-client';
import { ShopJsonLd } from '@/components/seo/ShopJsonLd';
import { fetchShop } from '@/lib/api/shops';

interface Params {
  shopId: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { shopId } = await params;
  const shop = await fetchShop(shopId);
  if (!shop) return { title: 'Shop not found' };

  const photo = shop.photoUrls?.[0];
  return {
    title: `${shop.name} — 啡遊`,
    description: shop.description ?? `探索 ${shop.name}，台灣精品咖啡廳。`,
    openGraph: {
      title: shop.name,
      description: shop.description ?? `探索 ${shop.name}，台灣精品咖啡廳。`,
      ...(photo ? { images: [{ url: photo, width: 1200, height: 630 }] } : {}),
    },
  };
}

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { shopId, slug } = await params;
  const shop = await fetchShop(shopId);

  if (!shop) {
    notFound();
  }

  // Canonical slug redirect — if URL slug doesn't match the stored slug, redirect
  if (shop.slug && slug !== shop.slug) {
    redirect(`/shops/${shopId}/${shop.slug}`);
  }

  return (
    <>
      <ShopJsonLd shop={shop} />
      <Suspense>
        <ShopDetailClient shop={shop} />
      </Suspense>
    </>
  );
}
