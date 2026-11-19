import type { Config } from 'tailwindcss';

// Tailwind scans these paths for class names it needs to generate CSS for.
// Because our UI lives under src/features/**, src/shared/**, and
// src/core/** (not just src/app/**), all three are listed here — miss one
// and components in that folder silently render unstyled.
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './src/shared/**/*.{ts,tsx}',
    './src/core/**/*.{ts,tsx}',
    './src/features/documentation/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
