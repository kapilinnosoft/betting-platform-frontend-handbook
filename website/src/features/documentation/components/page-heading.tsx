import type { ReactNode } from 'react';

export function PageHeading({ eyebrow, title, description, children }: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">{eyebrow}</div>}
        <h1 className="font-serif text-3xl font-medium leading-tight tracking-normal text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
      {children}
    </header>
  );
}

export function SectionHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between gap-4 border-b border-slate-200 pb-2 dark:border-slate-800">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {aside && <div className="text-xs text-slate-500 dark:text-slate-400">{aside}</div>}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const tone = lower.includes('backend')
    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
    : lower.includes('complete') || lower.includes('observed')
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
      : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  return <span className={`inline-flex max-w-full items-center rounded border px-2 py-1 text-[10px] font-bold uppercase leading-4 ${tone}`}>{value}</span>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="border-l-2 border-slate-300 py-2 pl-4 dark:border-slate-700"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{detail}</p></div>;
}