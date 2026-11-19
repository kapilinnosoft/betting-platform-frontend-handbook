import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading, SectionHeading } from '@/features/documentation/components/page-heading';
import { getDocumentedModules, getMarkdownDocument } from '@/features/documentation/lib/content';

export default async function ArchitecturePage() {
  const [architecture, stack, modules] = await Promise.all([
    getMarkdownDocument('docs/00-overview/application-architecture.md'),
    getMarkdownDocument('docs/00-overview/technology-stack.md'),
    getDocumentedModules(),
  ]);
  const hasUserPanelDocs = modules.some((module) => module.group === 'User Panel');
  return <>
    <PageHeading eyebrow="Platform Architecture" title="Architecture" description="Source-verified request, state, and polling flows. Panel boundaries without documentation are not inferred." />
    <section className="mb-8 grid border-y border-slate-200 md:grid-cols-3 dark:border-slate-800" aria-label="Panel documentation coverage">
      <PanelCoverage title="User Panel" status={hasUserPanelDocs ? 'Documented' : 'Not documented'} detail="The available architecture notes verify its client, query/cache, HTTP, Redux and backend-request flow." />
      <PanelCoverage title="Admin Panel" status="Not documented" detail="No Admin Panel architecture documentation is included in the current handbook set." />
      <PanelCoverage title="Result Panel" status="Not documented" detail="No Result Panel architecture documentation is included in the current handbook set." />
    </section>
    <MarkdownDocument markdown={architecture} sourcePath="docs/00-overview/application-architecture.md" />
    <SectionHeading title="Technology notes" />
    <MarkdownDocument markdown={stack} sourcePath="docs/00-overview/technology-stack.md" />
  </>;
}

function PanelCoverage({ title, status, detail }: { title: string; status: string; detail: string }) {
  return <div className="border-b border-r border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{title}</h2><span className="text-[10px] font-bold uppercase text-slate-500">{status}</span></div><p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{detail}</p></div>;
}