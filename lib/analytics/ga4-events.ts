// These helpers fire regardless of consent state — this is intentional.
// GA4 consent mode v2 handles denied users server-side via cookieless modeling.
// PostHog, by contrast, is blocked at init-time and never captures when denied.
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
