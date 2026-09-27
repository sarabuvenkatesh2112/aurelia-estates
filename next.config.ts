import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts' },
  trailingSlash: true,
  devIndicators: false,
  // Meta verification puts its secret in the query string; never log that URL.
  logging: { incomingRequests: { ignore: [/\/api\/whatsapp\/webhook(?:\/|\?|$)/] } },
};
export default nextConfig;
