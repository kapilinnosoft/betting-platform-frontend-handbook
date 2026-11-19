// src/app/layout.tsx
//
// The ROOT layout. Every route in the app renders inside this. In the App
// Router, `layout.tsx` files are Server Components by default — this one
// has no 'use client' directive, so it renders on the server and adds
// zero client JS of its own.
//
// Rules of thumb for this file:
//  - Only put things here that TRULY apply to every single page
//    (html/body tags, global CSS import, global providers, global fonts).
//  - Don't put page-specific UI here — that belongs in the feature's
//    own layout, e.g. src/app/(dashboard)/layout.tsx.

import type { Metadata } from 'next';
import { ThemeProvider } from '@/core/providers/theme-provider';
import { siteConfig } from '@/core/config/site';
import './globals.css';

// Next.js reads this export to populate <title>, <meta description>, etc.
// for every page that doesn't override it with its own `metadata` export.
export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* ThemeProvider is the ONLY client boundary at the root — see
            core/providers/theme-provider.tsx for why it's kept this small. */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
