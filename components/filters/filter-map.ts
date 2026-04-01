/**
 * Maps quick-filter UI IDs to taxonomy tag IDs in the database.
 * Quick filters use short IDs for cleaner URLs (?filters=wifi,quiet)
 * while taxonomy uses canonical IDs (wifi_available, power_outlets).
 */
export type TagFilterId = 'wifi' | 'outlet' | 'quiet' | 'cash_only' | 'mobile_payment';

export const FILTER_TO_TAG_IDS: Record<TagFilterId, string> = {
  wifi: 'wifi_available',
  outlet: 'power_outlets',
  quiet: 'quiet',
  cash_only: 'cash_only',
  mobile_payment: 'mobile_payment',
};

/** Filters handled by custom logic, not taxonomy tag matching. */
export const SPECIAL_FILTERS = ['open_now', 'rating'] as const;
