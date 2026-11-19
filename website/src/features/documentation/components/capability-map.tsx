import Link from 'next/link';
import { ArrowRight, Boxes, GitCompareArrows, Network } from 'lucide-react';
import type { CapabilityMap as CapabilityMapData } from '../lib/content';
import { getPrivateLabels, redactProjectLabels } from '../lib/privacy';
import { MarkdownDocument } from './markdown-document';

/**
 * Portal replacement for a module's standalone visual guide. Every value shown here is parsed
 * from the module's reference Markdown (see getCapabilityMap); nothing is hard-coded.
 */
export async function CapabilityMap({ data, sourcePath, overviewHref }: {
  data: CapabilityMapData;
  sourcePath: string;
  overviewHref: string;
}) {
  const labels = await getPrivateLabels();
  const safe = (value: string) => redactProjectLabels(value, labels);
  // Redact everything once, up front: React keys are serialised into the page payload too,
  // so no raw value may be used anywhere below.
  const rows = data.rows.map((row) => ({
    ...row,
    capability: safe(row.capability),
    apiReference: safe(row.apiReference),
    usage: safe(row.usage),
    sources: row.sources.map(safe),
    endpoints: row.endpoints.map(safe),
  }));
  const shared = rows.filter((row) => row.scope === 'Same endpoint in both').length;
  const endpoints = new Set(rows.flatMap((row) => row.endpoints));

  return (
    <div className="min-w-0">
      {data.intro && <p className="max-w-3xl text-[15px] leading-7 text-slate-700 dark:text-slate-300">{safe(data.intro)}</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
        <section aria-label="Capability map" className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-2"><Network className="size-3.5" aria-hidden="true" />Page capabilities</span>
            <span>Common capabilities, implementation differences inline</span>
          </div>
          <ol className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row) => (
              <li key={row.capability} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{row.capability}</h3>
                  {row.endpoints.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.endpoints.map((endpoint) => (
                        <code key={endpoint} className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 font-mono text-[12px] text-teal-900 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200">{endpoint}</code>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{row.apiReference}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{row.usage}</p>
                  {row.sources.length > 0 && (
                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-teal-800 hover:underline dark:text-teal-300">
                        {row.sources.length} source {row.sources.length === 1 ? 'citation' : 'citations'}
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {row.sources.map((source, index) => (
                          <li key={`${index}-${source}`} className="break-words font-mono text-[11px] leading-5 text-slate-500 dark:text-slate-400">{source}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <ScopeBadge scope={row.scope} />
              </li>
            ))}
          </ol>
        </section>

        <aside aria-label="At a glance" className="border-t-2 border-teal-700 pt-3 dark:border-teal-500">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">At a glance</h2>
          <dl className="mt-2 divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <Fact icon={<Boxes className="size-4" />} label="Capabilities" value={String(rows.length)} />
            <Fact icon={<GitCompareArrows className="size-4" />} label="Same endpoint in both" value={`${shared} of ${rows.length}`} />
            <Fact icon={<Network className="size-4" />} label="Distinct calls named" value={String(endpoints.size)} />
          </dl>
          <Link href={overviewHref} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline dark:text-teal-300">
            Open the detailed documentation <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </aside>
      </div>

      {data.remainder && (
        <div className="mt-4">
          <MarkdownDocument markdown={data.remainder} sourcePath={sourcePath} />
        </div>
      )}
    </div>
  );
}

function ScopeBadge({ scope }: { scope: CapabilityMapData['rows'][number]['scope'] }) {
  const tone = scope === 'Same endpoint in both'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
    : 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200';
  return <span className={`h-fit w-fit whitespace-nowrap rounded border px-2 py-1 text-[10px] font-bold uppercase leading-4 ${tone}`}>{scope}</span>;
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="flex items-center gap-2 text-slate-500">{icon}{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
