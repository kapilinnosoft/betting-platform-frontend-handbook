'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BookOpen, ChartNoAxesColumn, FileCode2, GitBranch, Home, Menu, PanelsTopLeft, Search, X } from 'lucide-react';
// ShieldCheck
import { cn } from '@/shared/lib/utils';
import type { ModuleDocument } from '@/features/documentation/lib/content';

const links = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/architecture', label: 'Architecture', icon: GitBranch },
  { href: '/user-panel', label: 'User Panel', icon: PanelsTopLeft },
  { href: '/api-explorer', label: 'API Explorer', icon: FileCode2 },
  { href: '/api-frequency', label: 'API Frequency', icon: ChartNoAxesColumn },
  { href: '/calculations', label: 'Calculations', icon: BookOpen },
  // { href: '/team-review', label: 'Team Review', icon: ShieldCheck },
];

export function Sidebar({ modules }: { modules: ModuleDocument[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const filter = query.trim().toLowerCase();
  const visibleLinks = useMemo(() => links.filter((link) => link.label.toLowerCase().includes(filter)), [filter]);
  const matching = useMemo(
    () => modules.filter((module) => module.displayTitle.toLowerCase().includes(filter)),
    [modules, filter],
  );
  const visibleModules = matching.filter((module) => module.group === 'User Panel');
  const visibleSupplemental = matching.filter((module) => module.group === 'Supplemental');
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) => cn(
    'flex min-h-9 items-center gap-2 rounded-md px-2.5 text-[13px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
    pathname === href && 'bg-teal-50 font-semibold text-teal-800 hover:bg-teal-50 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-950/60',
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <Link href="/" className="text-sm font-bold text-slate-900 dark:text-white">Betting Platform Docs</Link>
        <button type="button" className="inline-flex size-9 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-900" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <Link href="/" className="flex items-center gap-2.5 px-1 text-[14px] font-extrabold text-slate-950 dark:text-white">
          <span className="grid size-8 place-items-center rounded-md bg-teal-700 text-white"><BookOpen className="size-4" /></span>
          <span>Betting Platform Docs</span>
        </Link>
        <label className="relative mt-5 block">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documentation" aria-label="Search documentation navigation" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none placeholder:text-slate-400 focus:border-teal-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
        </label>
        <nav className="mt-4 space-y-1" aria-label="Documentation">
          {visibleLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={linkClass(href)} onClick={() => setMobileOpen(false)}><Icon className="size-4 shrink-0" aria-hidden="true" /><span>{label}</span></Link>)}
          <div className="pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Documented modules</div>
          {visibleModules.map((module) => {
            const href = `/user-panel/${module.slug}`;
            return <Link key={module.folder} href={href} aria-current={isActive(href) ? 'page' : undefined} className={linkClass(href)} onClick={() => setMobileOpen(false)}>{module.displayTitle}</Link>;
          })}
          {visibleSupplemental.length > 0 && <div className="pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplemental references</div>}
          {visibleSupplemental.map((module) => {
            const href = `/user-panel/${module.slug}`;
            return <Link key={module.folder} href={href} aria-current={isActive(href) ? 'page' : undefined} className={linkClass(href)} onClick={() => setMobileOpen(false)}>{module.displayTitle}</Link>;
          })}
          <div className="pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Panels</div>
          <span className="flex min-h-9 items-center px-2.5 text-[13px] text-slate-400" aria-disabled="true">Admin Panel <span className="ml-auto text-[10px]">Undocumented</span></span>
          <span className="flex min-h-9 items-center px-2.5 text-[13px] text-slate-400" aria-disabled="true">Result Panel <span className="ml-auto text-[10px]">Undocumented</span></span>
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-400 dark:border-slate-800">Source-backed internal reference</div>
      </aside>
    </>
  );
}
