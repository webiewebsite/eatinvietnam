import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native-ish DB driver stays a plain Node require (not bundled) in server code.
  serverExternalPackages: ['mysql2', 'nodemailer'],
  images: {
    // Images are pre-resized (R2) or served by a CDN that resizes (Pexels demo),
    // so Next's own optimizer never runs on Hostinger.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
};

export default nextConfig;
