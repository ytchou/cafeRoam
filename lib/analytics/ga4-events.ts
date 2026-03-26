function isEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

export function trackSearch(searchTerm: string) {
  if (!isEnabled()) return;
  window.gtag?.('event', 'search', { search_term: searchTerm });
}

export function trackShopDetailView(shopId: string) {
  if (!isEnabled()) return;
  window.gtag?.('event', 'shop_detail_view', { shop_id: shopId });
}

export function trackSignupCtaClick(ctaLocation: string) {
  if (!isEnabled()) return;
  window.gtag?.('event', 'signup_cta_click', { cta_location: ctaLocation });
}
