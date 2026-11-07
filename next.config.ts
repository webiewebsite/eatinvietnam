import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Images are pre-resized (R2) or served by a CDN that resizes (Pexels demo),
    // so Next's own optimizer never runs on Hostinger.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
};

export default nextConfig;
