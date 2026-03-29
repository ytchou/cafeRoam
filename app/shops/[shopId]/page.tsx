import { notFound, redirect } from 'next/navigation';
import { BACKEND_URL } from '@/lib/api/proxy';

interface Params {
  shopId: string;
}

export default async function ShopRedirectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { shopId } = await params;

  const res = await fetch(`${BACKEND_URL}/shops/${shopId}`, {
    next: { revalidate: 300 },
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch shop: ${res.status}`);
  }

  const shop = await res.json();
  redirect(`/shops/${shopId}/${shop.slug ?? shopId}`);
}
