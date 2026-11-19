import Link from 'next/link';
import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { getDocumentedModules, getMarkdownDocument } from '@/features/documentation/lib/content';
import { PageHeading, SectionHeading, StatusBadge } from '@/features/documentation/components/page-heading';

const MODULE_MAP = 'docs/01-user-panel/overview.md';

export default async function UserPanelPage() {
  const [modules, moduleMap] = await Promise.all([getDocumentedModules(), getMarkdownDocument(MODULE_MAP)]);
  const userModules = modules.filter((module) => module.group === 'User Panel');
  const supplemental = modules.filter((module) => module.group === 'Supplemental');
  return <>
    <PageHeading eyebrow="Panel documentation" title="User Panel" description="Only modules with existing overview documents appear here. Analysis-only areas are not presented as completed documentation." />
    <SectionHeading title="Documented modules" aside={`${userModules.length} modules with overview documents`} />
    <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {userModules.map((module) => <Link key={module.slug} href={`/user-panel/${module.slug}`} className="grid gap-2 py-4 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center dark:hover:bg-slate-900/50"><span><span className="block font-semibold">{module.displayTitle}</span><span className="mt-1 block text-xs text-slate-500">{module.documents.length} source-backed documents</span></span><StatusBadge value={module.status} /></Link>)}
    </div>
    {supplemental.length > 0 && <><SectionHeading title="Supplemental references" /><div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{supplemental.map((module) => <Link key={module.slug} href={`/user-panel/${module.slug}`} className="flex items-center justify-between gap-3 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/50"><span><span className="block font-semibold">{module.displayTitle}</span><span className="mt-1 block text-xs text-slate-500">{module.documents.length} source-backed documents</span></span><StatusBadge value={module.status} /></Link>)}</div></>}
    {/* The module map is the canonical overview; section links from module documents land on its headings. */}
    <SectionHeading title="Module map" aside="Routes, entry files and endpoints for every Phase 1 module" />
    <MarkdownDocument markdown={moduleMap} sourcePath={MODULE_MAP} />
  </>;
}
