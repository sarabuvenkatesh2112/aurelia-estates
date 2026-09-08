import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'export',
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts' },
  trailingSlash: true,
  devIndicators: false,
};
export default nextConfig;
