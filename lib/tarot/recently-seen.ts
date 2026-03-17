export const STORAGE_KEY = 'caferoam:tarot:seen';
export const MAX_SEEN = 9;

export function getRecentlySeenIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentlySeenIds(ids: string[]): void {
  const existing = getRecentlySeenIds();
  const combined = [...existing, ...ids];
  const capped = combined.slice(-MAX_SEEN);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
}

export function clearRecentlySeen(): void {
  localStorage.removeItem(STORAGE_KEY);
}
