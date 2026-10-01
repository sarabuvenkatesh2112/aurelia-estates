import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts' },
  trailingSlash: true,
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Enforced compatible baseline. A nonce-based script policy needs deployment validation.
          {
            key: 'Content-Security-Policy',
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
          },
          ...(process.env.NODE_ENV === 'production' &&
          process.env.SITE_URL?.startsWith('https:')
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
            : []),
        ],
      },
    ];
  },
  // Meta verification puts its secret in the query string; never log that URL.
  logging: {
    incomingRequests: { ignore: [/\/api\/whatsapp\/webhook(?:\/|\?|$)/] },
  },
};
export default nextConfig;
