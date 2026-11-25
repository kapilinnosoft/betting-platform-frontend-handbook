'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { ApiRecord } from '@/features/documentation/lib/content';
import { MODULE_SEPARATOR } from '@/features/documentation/lib/api-records';
import { StatusBadge } from './page-heading';

export function ApiExplorer({ records }: { records: ApiRecord[] }) {
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState('All panels');
  const [module, setModule] = useState('All modules');
  const [method, setMethod] = useState('All methods');
  const [trigger, setTrigger] = useState('All triggers');
  const [polling, setPolling] = useState('All frequencies');
  const [verification, setVerification] = useState('All statuses');

  const panels = useMemo(() => ['All panels', ...new Set(records.map((record) => record.panel))], [records]);
  const modules = useMemo(() => ['All modules', ...new Set(records
    .filter((record) => panel === 'All panels' || record.panel === panel)
    .flatMap((record) => record.module.split(MODULE_SEPARATOR)))], [records, panel]);
  const choosePanel = (value: string) => {
    setPanel(value);
    // Keep the module filter only if that module exists in the chosen panel.
    if (value !== 'All panels' && !records.some((record) => record.panel === value && record.module.split(MODULE_SEPARATOR).includes(module))) setModule('All modules');
  };
  const methods = useMemo(() => ['All methods', ...new Set(records.map((record) => record.method))], [records]);
  const triggers = useMemo(() => ['All triggers', ...new Set(records.map((record) => record.trigger))], [records]);
  const statuses = useMemo(() => ['All statuses', ...new Set(records.map((record) => record.verification))], [records]);

  const filtered = records.filter((record) => {
    const haystack = [record.name, record.aliases.join(' '), record.endpoint, record.module, record.source, record.consumers, record.notes].join(' ').toLowerCase();
    return (panel === 'All panels' || record.panel === panel)
      && (!query || haystack.includes(query.toLowerCase()))
      && (module === 'All modules' || record.module.split(MODULE_SEPARATOR).includes(module))
      && (method === 'All methods' || record.method === method)
      && (trigger === 'All triggers' || record.trigger === trigger)
      && (polling === 'All frequencies' || record.polling === polling)
      && (verification === 'All statuses' || record.verification === verification);
  });

  return (
    <div>
      <div className="grid gap-2 border-y border-slate-200 py-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-3">
        <label className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search path, function, fields" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-teal-600 dark:border-slate-800 dark:bg-slate-950" /></label>
        <Filter label="Panel" value={panel} options={panels} onChange={choosePanel} />
        <Filter label="Module" value={module} options={modules} onChange={setModule} />
        <Filter label="Method" value={method} options={methods} onChange={setMethod} />
        <Filter label="Trigger" value={trigger} options={triggers} onChange={setTrigger} />
        <Filter label="Polling" value={polling} options={['All frequencies', 'Polling', 'Non-polling', 'Not confirmed from source']} onChange={setPolling} />
        <Filter label="Verification" value={verification} options={statuses} onChange={setVerification} />
      </div>
      <div className="flex items-center justify-between py-3 text-xs text-slate-500"><span>{filtered.length} API paths</span><span>Inventory-derived; payload details are in linked module docs.</span></div>
      <div className="overflow-x-auto border-y border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr>{['Method / endpoint', 'Module', 'Trigger', 'Frequency', 'Status', 'Details'].map((head) => <th key={head} className="px-3 py-2.5 font-bold">{head}</th>)}</tr></thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id} id={slug(record.id)} className="border-t border-slate-100 align-top dark:border-slate-900">
                <td className="px-3 py-3"><div className="font-mono font-semibold text-slate-900 dark:text-slate-100">{record.method} {record.endpoint}</div><div className="mt-1 text-slate-500">{record.aliases.join(', ')}</div></td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{record.panel}</div>{record.module}</td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{record.trigger}</td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{record.frequency}</td>
                <td className="px-3 py-3"><StatusBadge value={record.verification} /></td>
                <td className="px-3 py-3"><details className="group max-w-[340px]"><summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-teal-800 dark:text-teal-300"><ChevronDown className="size-3 transition-transform group-open:rotate-180" /> Inspect</summary><dl className="mt-3 space-y-2 leading-5"><Detail label="Purpose / notes" value={record.notes || 'Not confirmed from source.'} /><Detail label="Source" value={record.source || 'Not confirmed from source.'} /><Detail label="Consumers" value={record.consumers || 'Not confirmed from source.'} /><Detail label="Response fields and state updates" value="See the linked module documentation; this endpoint registry does not define a captured response contract." /></dl>{record.detailHref && <a className="mt-3 inline-block font-semibold text-teal-800 underline dark:text-teal-300" href={record.detailHref}>Open API details</a>}</details></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No API entries match these filters.</p>}
      </div>
    </div>
  );
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 dark:border-slate-800 dark:bg-slate-950"><span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">{label}</span><select className="min-w-0 flex-1 bg-transparent text-xs outline-none" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-slate-500">{label}</dt><dd className="break-words text-slate-700 dark:text-slate-300">{value}</dd></div>;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}