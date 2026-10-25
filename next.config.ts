import type { NextConfig } from 'next';
import { PROGRAM_RETIREMENT_REDIRECTS } from './src/lib/seo/programAliases';

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-left',
  },
  async redirects() {
    return Object.entries(PROGRAM_RETIREMENT_REDIRECTS).map(([id, destination]) => ({
      source: `/programs/${id}`,
      destination,
      permanent: true,
    }));
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://eu-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
