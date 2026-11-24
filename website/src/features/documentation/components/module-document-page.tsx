import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CapabilityMap } from '@/features/documentation/components/capability-map';
import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading, StatusBadge } from '@/features/documentation/components/page-heading';
import { displayTitle, getCapabilityMap, getDocumentedModules, getMarkdownDocument, modulePageHref, type PanelKey } from '@/features/documentation/lib/content';
import { getPrivateLabels, redactProjectLabels } from '@/features/documentation/lib/privacy';

export interface ModulePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ doc?: string }>;
}

/** One documented module with a tab per Markdown document; shared by every panel's [slug] route. */
export async function ModuleDocumentPage({ panel, params, searchParams }: ModulePageProps & { panel: PanelKey }) {
  const [{ slug }, query, modules, labels] = await Promise.all([params, searchParams, getDocumentedModules(panel), getPrivateLabels()]);
  const moduleInfo = modules.find((item) => item.slug === slug);
  if (!moduleInfo) notFound();
  const selected = moduleInfo.documents.find((document) => document.key === query.doc) ?? moduleInfo.documents[0];
  if (!selected) notFound();

  const capabilityMap = selected.kind === 'visual' ? await getCapabilityMap(selected.path) : undefined;
  const markdown = selected.kind === 'markdown' || !capabilityMap ? await getMarkdownDocument(selected.path) : '';

  return <>
    <PageHeading eyebrow={moduleInfo.group} title={redactProjectLabels(moduleInfo.displayTitle, labels)} description={moduleInfo.status}>
      <StatusBadge value={moduleInfo.status} />
    </PageHeading>
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800" aria-label="Module documents">
      {moduleInfo.documents.map((document) => {
        const active = selected.key === document.key;
        const tabTitle = document.key === 'overview' ? 'Overview' : document.kind === 'visual' ? document.title : displayTitleForTab(document.title, moduleInfo.displayTitle);
        return <Link key={document.key} href={modulePageHref(moduleInfo, document.key)} aria-current={active ? 'page' : undefined} className={`border-b-2 px-3 py-2 text-xs font-semibold ${active ? 'border-teal-700 text-teal-800 dark:text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{redactProjectLabels(tabTitle, labels)}</Link>;
      })}
    </nav>
    {capabilityMap
      ? <CapabilityMap data={capabilityMap} sourcePath={selected.path} overviewHref={modulePageHref(moduleInfo)} />
      : <MarkdownDocument markdown={markdown} sourcePath={selected.path} />}
  </>;
}

/** "Module 1: Home Page (API inventory)" → "API inventory"; "Home Page (common reference)" → "Common reference". */
function displayTitleForTab(title: string, moduleTitle: string): string {
  const qualifier = title.match(/\(([^)]*)\)\s*$/)?.[1];
  if (qualifier) return qualifier.charAt(0).toUpperCase() + qualifier.slice(1);
  const plain = displayTitle(title);
  return plain === moduleTitle ? 'Overview' : plain;
}
