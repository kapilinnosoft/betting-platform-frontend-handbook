import type { NextConfig } from 'next';

// ─────────────────────────────────────────────────────────────────────────
// next.config.ts
//
// As of Next.js 16, Turbopack is the STABLE, DEFAULT bundler for both
// `next dev` and `next build` — you don't need a --turbopack flag anymore,
// and you don't need to configure it unless you want non-default behavior.
// ─────────────────────────────────────────────────────────────────────────
const nextConfig: NextConfig = {
  // Speeds up cold starts / rebuilds by caching Turbopack's work on disk
  // between `next dev` runs. Safe to enable; delete `.next/cache` if you
  // ever see stale-build weirdness.
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  // Example of the kind of thing that lives here: allow-list remote image
  // domains so `next/image` can optimize images from your API/CDN.
  images: {
    remotePatterns: [
      // { protocol: 'https', hostname: 'your-cdn.example.com' },
    ],
  },
};

export default nextConfig;
