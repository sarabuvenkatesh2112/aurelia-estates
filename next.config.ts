import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts' },
  trailingSlash: true,
  devIndicators: false,
};
export default nextConfig;
