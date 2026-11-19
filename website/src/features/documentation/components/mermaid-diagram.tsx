'use client';

import mermaid from 'mermaid';
import { useEffect, useId, useState } from 'react';
import { useTheme } from '@/core/providers/theme-provider';

export function MermaidDiagram({ diagram, label }: { diagram: string; label?: string }) {
  const { theme } = useTheme();
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [result, setResult] = useState<{ diagram: string; theme: string; svg?: string; failed?: boolean } | null>(null);
  const currentResult = result?.diagram === diagram && result.theme === theme ? result : null;

  useEffect(() => {
    let active = true;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      htmlLabels: false,
    });
    mermaid
      .render(`diagram-${generatedId}`, diagram)
      .then(({ svg: output }) => {
        if (active) setResult({ diagram, theme, svg: output });
      })
      .catch(() => {
        if (active) setResult({ diagram, theme, failed: true });
      });
    return () => { active = false; };
  }, [diagram, generatedId, theme]);

  if (currentResult?.failed) {
    return <pre className="my-5 overflow-x-auto rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">Diagram could not be rendered.</pre>;
  }

  return (
    <figure className="my-6 overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" aria-label={label ?? 'Architecture diagram'}>
      {currentResult?.svg ? <div className="mx-auto min-w-max max-w-full" dangerouslySetInnerHTML={{ __html: currentResult.svg }} /> : <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-900" />}
      {label && <figcaption className="mt-3 text-center text-xs text-slate-500">{label}</figcaption>}
    </figure>
  );
}