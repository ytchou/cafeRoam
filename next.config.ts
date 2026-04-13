import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/map', destination: '/', permanent: true },
      { source: '/find', destination: '/', permanent: true },
      { source: '/search', destination: '/', permanent: true },
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
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
};

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
  telemetry: false,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  errorHandler: () => {
    // Suppress all Sentry CLI errors during build - they're non-blocking
    // and Sentry runtime tracking still works via sentry.client.config.ts
  },
};

// withSentryConfig uses webpack plugins incompatible with Turbopack dev server.
// Skip it in development — Sentry still initialises at runtime via sentry.client.config.ts.
// Also skip if Sentry env vars are not fully configured to prevent build failures.
const shouldEnableSentry =
  process.env.NODE_ENV === 'production' &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT &&
  process.env.SENTRY_AUTH_TOKEN;

export default shouldEnableSentry
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
