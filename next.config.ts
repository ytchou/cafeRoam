import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
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
