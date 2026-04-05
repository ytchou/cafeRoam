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

  redirect(`/shops/${shopId}/${shop.slug ?? '_'}`);
}
