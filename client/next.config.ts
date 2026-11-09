import type { NextConfig } from 'next';

/**
 * The browser talks only to this Next.js origin. GraphQL and uploads are
 * proxied to the NestJS API, so the HttpOnly refresh cookie stays first-party.
 */
const apiUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/graphql', destination: `${apiUrl}/graphql` },
      { source: '/uploads', destination: `${apiUrl}/uploads` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
