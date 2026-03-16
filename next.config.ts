import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/map', destination: '/', permanent: true },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
      },
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
      },
    ],
  },
};

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
};

// withSentryConfig uses webpack plugins incompatible with Turbopack dev server.
// Skip it in development — Sentry still initialises at runtime via sentry.client.config.ts.
export default process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
