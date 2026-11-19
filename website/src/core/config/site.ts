// src/core/config/site.ts
//
// Plain constants, not routing, not React — safe to import from a Server
// Component (e.g. to build `metadata` exports) or a Client Component alike.

export const siteConfig = {
  name: 'Betting Platform Architecture',
  description: 'Source-backed technical documentation for a generic betting platform.',
  // Used to build absolute URLs (OG images, canonical links, etc). Set this
  // per environment via NEXT_PUBLIC_SITE_URL in .env.local.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};
