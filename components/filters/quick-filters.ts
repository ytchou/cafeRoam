export interface QuickFilter {
  id: string;
  label: string;
  dot?: string;
}

export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'open_now', label: 'Open Now', dot: 'var(--link-green)' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'outlet', label: 'Outlet' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'rating', label: 'Top Rated' },
];
