import { notFound, redirect } from 'next/navigation';
import { fetchShop } from '@/lib/api/shops';

interface Params {
  shopId: string;
}

export default async function ShopRedirectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { shopId } = await params;
  const shop = await fetchShop(shopId);

  if (!shop) {
    notFound();
  }

  // When a shop has no slug, fall back to shopId to keep the URL valid.
  redirect(`/shops/${shopId}/${shop.slug ?? shopId}`);
}
