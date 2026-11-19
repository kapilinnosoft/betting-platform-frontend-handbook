import { ThemeToggle } from '@/features/documentation/components/theme-toggle';

export function Navbar() {
  return (
    <header className="hidden h-12 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950 lg:flex">
      <span className="text-xs text-slate-500 dark:text-slate-400">Internal technical documentation</span>
      <ThemeToggle />
    </header>
  );
}
