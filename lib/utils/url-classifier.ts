const SOCIAL_DOMAINS = new Set([
  'instagram.com',
  'www.instagram.com',
  'instagr.am',
  'facebook.com',
  'fb.com',
  'm.facebook.com',
  'www.facebook.com',
  'fb.me',
  'threads.net',
  'www.threads.net',
]);

export function isSocialUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return SOCIAL_DOMAINS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}
