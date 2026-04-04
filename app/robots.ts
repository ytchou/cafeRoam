import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shops/', '/explore/'],
        disallow: [
          '/profile',
          '/lists',
          '/settings',
          '/login',
          '/signup',
          '/api/',
          '/shops/*/claim',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/shops/', '/explore/'],
        disallow: [
          '/profile',
          '/lists',
          '/settings',
          '/login',
          '/signup',
          '/api/',
          '/shops/*/claim',
        ],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/shops/', '/explore/'],
        disallow: [
          '/profile',
          '/lists',
          '/settings',
          '/login',
          '/signup',
          '/api/',
          '/shops/*/claim',
        ],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/shops/', '/explore/'],
        disallow: [
          '/profile',
          '/lists',
          '/settings',
          '/login',
          '/signup',
          '/api/',
          '/shops/*/claim',
        ],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/shops/', '/explore/'],
        disallow: [
          '/profile',
          '/lists',
          '/settings',
          '/login',
          '/signup',
          '/api/',
          '/shops/*/claim',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
