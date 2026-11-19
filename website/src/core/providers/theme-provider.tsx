'use client';
// ─────────────────────────────────────────────────────────────────────────
// 'use client' is required here because this file uses React state
// (useState) and browser APIs (localStorage) — things that can only run
// in the browser, not during server rendering.
//
// IMPORTANT PATTERN: keep 'use client' boundaries as LOW/SMALL as possible.
// We don't put 'use client' on the root layout itself — only on this small
// provider component that the root layout wraps its children with. That
// way every Server Component further down the tree (most pages, most of
// the actual UI) still renders on the server and ships zero JS for itself.
// ─────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }, []);
  const getSnapshot = useCallback((): Theme => localStorage.getItem('theme') === 'dark' ? 'dark' : 'light', []);
  const theme = useSyncExternalStore<Theme>(subscribe, getSnapshot, () => 'light');
  const setTheme = useCallback((nextTheme: Theme) => {
    localStorage.setItem('theme', nextTheme);
    window.dispatchEvent(new Event('storage'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// Hook feature components use to read/toggle theme, e.g.:
//   const { theme, setTheme } = useTheme();
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
