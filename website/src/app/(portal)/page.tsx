import Link from 'next/link';
import { ArrowRight, CircleHelp, Clock3, FileCode2, Sigma } from 'lucide-react';
import { getDashboardStats, getDocumentedModules, getOpenQuestions, getRecentDocumentation } from '@/features/documentation/lib/content';
import { getPrivateLabels, redactProjectLabels } from '@/features/documentation/lib/privacy';
import { PageHeading, SectionHeading, StatusBadge } from '@/features/documentation/components/page-heading';

export default async function OverviewPage() {
  const [stats, modules, questions, recent, labels] = await Promise.all([
    getDashboardStats(), getDocumentedModules(), getOpenQuestions(), getRecentDocumentation(5), getPrivateLabels(),
  ]);
  const adminModules = await getDocumentedModules('admin');
  const adminCompleted = adminModules.filter((module) => /DOCUMENTATION COMPLETE/i.test(module.status));
  const coreModules = modules.filter((module) => module.group === 'User Panel');
  const completed = coreModules.filter((module) => /DOCUMENTATION COMPLETE/i.test(module.status));
  const pendingQuestions = questions.filter((question) => !/resolved/i.test(question.status));
  const backendQuestions = pendingQuestions.filter((question) => /BACKEND CONFIRMATION REQUIRED/i.test(question.label));

  return (
    <div>
      <PageHeading eyebrow="Technical reference" title="Betting Platform Architecture" description="A source-backed guide to documented platform modules, API behavior, polling, calculations, and open verification questions." />

      <section aria-label="Documentation summary" className="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-3 xl:grid-cols-5 dark:border-slate-800">
        <Metric label="User Panel modules" value={`${completed.length} / ${stats.userModules}`} detail="Documentation complete" />
        <Metric label="Supplemental modules" value={`${stats.documentedSupplementalModules} / ${stats.supplementalModules}`} detail="Authentication reference" />
        <Metric label="API paths" value={stats.apiDefinitions} detail="Derived from endpoint registry" icon={<FileCode2 className="size-4" />} />
        <Metric label="Polling entries" value={stats.pollingEntries} detail="Intervals listed in inventory" icon={<Clock3 className="size-4" />} />
        <Metric label="Open questions" value={stats.openQuestions} detail={`${stats.backendQuestions} need backend confirmation`} icon={<CircleHelp className="size-4" />} />
      </section>

      <SectionHeading title="Platform panels" />
      <div className="grid gap-0 border-y border-slate-200 md:grid-cols-3 dark:border-slate-800">
        <Panel title="User Panel" status={`${completed.length} documented modules`} detail={`${[...completed, ...modules.filter((module) => module.group === 'Supplemental')].map((module) => module.displayTitle).join(', ')} have module-level documentation; remaining areas are shown only when supported by existing documentation.`} href="/user-panel" />
        {adminModules.length > 0
          ? <Panel title="Admin Panel" status={`${adminCompleted.length} documented modules`} detail={`${adminModules.map((module) => module.displayTitle).join(', ')} have module-level documentation (Phase 2, in progress).`} href="/admin-panel" />
          : <Panel title="Admin Panel" status="Not documented" detail="Architecture and module content are not available in the current handbook." />}
        <Panel title="Result Panel" status="Not documented" detail="Architecture and module content are not available in the current handbook." />
      </div>

      <SectionHeading title="Documented modules" aside={<Link href="/user-panel" className="text-teal-800 hover:underline dark:text-teal-300">All modules <ArrowRight className="inline size-3" /></Link>} />
      <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {completed.map((module) => <Link key={module.folder} href={`/user-panel/${module.slug}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"><span className="font-medium text-slate-900 dark:text-slate-100">{redactProjectLabels(module.displayTitle, labels)}</span><span className="flex items-center gap-3"><StatusBadge value="Documentation complete" /><span className="text-xs text-slate-400">{module.documents.length} documents</span></span></Link>)}
      </div>

      <div className="grid gap-x-10 xl:grid-cols-2">
        <section>
          <SectionHeading title="API and frequency" />
          <div className="grid grid-cols-2 gap-x-8 border-y border-slate-200 py-4 dark:border-slate-800">
            <Fact label="API explorer" value={`${stats.apiDefinitions} route/method entries`} href="/api-explorer" icon={<FileCode2 className="size-4" />} />
            <Fact label="Polling reference" value={`${stats.pollingEntries} documented interval rows`} href="/api-frequency" icon={<Clock3 className="size-4" />} />
          </div>
          <SectionHeading title="Documented calculations" />
          <Link href="/calculations" className="flex items-center justify-between border-y border-slate-200 py-4 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"><span><span className="block font-medium">Bet slip, exposure, and cashout logic</span><span className="mt-1 block text-xs text-slate-500">Source-derived; backend settlement behavior is not inferred.</span></span><Sigma className="size-4 text-teal-700 dark:text-teal-300" /></Link>
        </section>

        <section>
          <SectionHeading title="Technical questions" aside={<Link href="/team-review" className="text-teal-800 hover:underline dark:text-teal-300">Review questions <ArrowRight className="inline size-3" /></Link>} />
          <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {backendQuestions.slice(0, 3).map((question) => <Link key={question.id} href="/team-review" className="block py-3"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">{question.id}</span><StatusBadge value="Backend confirmation required" /></div><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{redactProjectLabels(question.question, labels)}</p></Link>)}
            {pendingQuestions.length > 0 && <p className="py-3 text-xs text-slate-500">{pendingQuestions.length} open questions total; see Team Review for the full list.</p>}
          </div>
          <SectionHeading title="Recently updated documentation" />
          <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {recent.map((item) => <Link key={item.path} href={item.href} className="flex items-center justify-between gap-4 py-2.5 text-sm hover:text-teal-800 dark:hover:text-teal-300"><span>{redactProjectLabels(item.title, labels)}</span><time className="shrink-0 text-xs text-slate-500">{item.modified.toLocaleDateString()}</time></Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon?: React.ReactNode }) {
  return <div className="min-w-0 border-b border-r border-slate-200 px-3 py-4 sm:px-4 dark:border-slate-800"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{icon}{label}</div><div className="mt-2 text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">{value}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</div></div>;
}

function Panel({ title, status, detail, href }: { title: string; status: string; detail: string; href?: string }) {
  const content = <div className="border-b border-r border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{title}</h3><span className="text-[10px] font-bold uppercase text-slate-500">{status}</span></div><p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{detail}</p></div>;
  return href ? <Link href={href} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">{content}</Link> : content;
}

function Fact({ label, value, href, icon }: { label: string; value: string; href: string; icon: React.ReactNode }) {
  return <Link href={href} className="group py-1"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500">{icon}{label}</span><span className="mt-2 block text-sm font-medium group-hover:text-teal-800 dark:group-hover:text-teal-300">{value}</span></Link>;
}
