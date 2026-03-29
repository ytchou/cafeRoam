import { BACKEND_URL } from '@/lib/api/proxy';

// Cached for 5 minutes — slug changes are rare; the canonical-slug redirect
// in [slug]/page.tsx handles stale redirects gracefully.
export async function fetchShop(shopId: string) {
  const res = await fetch(`${BACKEND_URL}/shops/${shopId}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch shop: ${res.status}`);
  return res.json();
}
