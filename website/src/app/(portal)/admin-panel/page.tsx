import Link from 'next/link';
import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading, SectionHeading, StatusBadge } from '@/features/documentation/components/page-heading';
import { getDocumentedModules, getMarkdownDocument, PANELS } from '@/features/documentation/lib/content';
import { getPrivateLabels, redactProjectLabels } from '@/features/documentation/lib/privacy';

const PANEL_OVERVIEW = PANELS.admin.overview;

export default async function AdminPanelPage() {
  const [modules, overview, labels] = await Promise.all([getDocumentedModules('admin'), getMarkdownDocument(PANEL_OVERVIEW), getPrivateLabels()]);
  return <>
    <PageHeading eyebrow="Panel documentation" title="Admin Panel" description="Phase 2. Only modules with existing overview documents appear here; each module is added after team approval." />
    <SectionHeading title="Documented modules" aside={`${modules.length} modules with overview documents`} />
    <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {modules.map((module) => <Link key={module.slug} href={`${PANELS.admin.route}/${module.slug}`} className="grid gap-2 py-4 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center dark:hover:bg-slate-900/50"><span><span className="block font-semibold">{redactProjectLabels(module.displayTitle, labels)}</span><span className="mt-1 block text-xs text-slate-500">{module.documents.length} source-backed documents</span></span><StatusBadge value={module.status} /></Link>)}
    </div>
    {/* The panel overview holds roles, permissions and the API client; module documents link to its headings. */}
    <SectionHeading title="Panel overview" aside="Roles, hierarchy, permissions and API client" />
    <MarkdownDocument markdown={overview} sourcePath={PANEL_OVERVIEW} />
  </>;
}
