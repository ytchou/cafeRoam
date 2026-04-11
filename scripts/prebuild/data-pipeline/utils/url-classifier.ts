const INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'instagr.am',
]);
const FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'fb.com',
  'm.facebook.com',
  'www.facebook.com',
  'fb.me',
]);
const THREADS_HOSTS = new Set(['threads.net', 'www.threads.net']);

export interface SocialUrls {
  instagram_url: string | null;
  facebook_url: string | null;
  threads_url: string | null;
}

export function classifySocialUrl(url: string | null | undefined): SocialUrls {
  const result: SocialUrls = {
    instagram_url: null,
    facebook_url: null,
    threads_url: null,
  };

  if (!url) return result;

  try {
    const host = new URL(url).hostname.toLowerCase();

    if (INSTAGRAM_HOSTS.has(host)) result.instagram_url = url;
    else if (FACEBOOK_HOSTS.has(host)) result.facebook_url = url;
    else if (THREADS_HOSTS.has(host)) result.threads_url = url;
  } catch {
    // invalid URL — return nulls
  }

  return result;
}
