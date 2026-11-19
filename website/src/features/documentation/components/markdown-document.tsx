import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPrivateLabels, createPrivacyPlugin, privateSafeHref } from '../lib/privacy';
import { portalHrefForMarkdown } from '../lib/content';
import { MermaidDiagram } from './mermaid-diagram';

export async function MarkdownDocument({
  markdown,
  sourcePath,
}: {
  markdown: string;
  sourcePath: string;
}) {
  const labels = await getPrivateLabels();

  const components: Components = {
    h1: ({ children, id }) => <h1 id={id} className="mb-6 scroll-mt-24 font-serif text-4xl font-medium tracking-normal text-slate-950 dark:text-white">{children}</h1>,
    h2: ({ children, id }) => <h2 id={id} className="mb-4 mt-12 scroll-mt-24 border-b border-slate-200 pb-2 text-2xl font-semibold tracking-normal text-slate-900 dark:border-slate-800 dark:text-white">{children}</h2>,
    h3: ({ children, id }) => <h3 id={id} className="mb-3 mt-8 scroll-mt-24 text-lg font-semibold text-slate-900 dark:text-slate-100">{children}</h3>,
    h4: ({ children, id }) => <h4 id={id} className="mb-2 mt-6 scroll-mt-24 text-base font-semibold text-slate-900 dark:text-slate-100">{children}</h4>,
    p: ({ children }) => <p className="my-4 max-w-none text-[15px] leading-7 text-slate-700 dark:text-slate-300">{children}</p>,
    a: ({ href, children }) => {
      if (!href) return <span>{children}</span>;
      const external = /^https?:|^mailto:/.test(href);
      const localHref = external ? href : privateSafeHref(portalHrefForMarkdown(sourcePath, href), labels);
      // A link to a handbook file the portal does not publish (e.g. the private project list)
      // stays readable as text instead of becoming a dead link.
      if (!external && /\.(md|html)$/.test(localHref.split('#')[0]?.split('?')[0] ?? '')) return <span>{children}</span>;
      return external
        ? <a href={localHref} target="_blank" rel="noreferrer" className="text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900 dark:text-teal-300">{children}</a>
        : <Link href={localHref} className="text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900 dark:text-teal-300">{children}</Link>;
    },
    ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-700 dark:text-slate-300">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-slate-700 dark:text-slate-300">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => <blockquote className="my-5 border-l-2 border-teal-600 pl-4 text-slate-600 dark:text-slate-400">{children}</blockquote>,
    table: ({ children }) => <div className="my-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table></div>,
    thead: ({ children }) => <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">{children}</thead>,
    th: ({ children }) => <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">{children}</th>,
    td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2.5 align-top text-slate-700 dark:border-slate-900 dark:text-slate-300">{children}</td>,
    tr: ({ children }) => <tr className="odd:bg-white even:bg-slate-50/70 dark:odd:bg-slate-950 dark:even:bg-slate-900/50">{children}</tr>,
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const language = /language-([\w-]+)/.exec(className ?? '')?.[1];
      const value = String(children).replace(/\n$/, '');
      if (language === 'mermaid') return <MermaidDiagram diagram={value} />;
      if (className) return <pre className="my-5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px] leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"><code>{children}</code></pre>;
      return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.86em] text-slate-800 dark:bg-slate-900 dark:text-slate-200">{children}</code>;
    },
    hr: () => <hr className="my-8 border-slate-200 dark:border-slate-800" />,
  };

  return (
    <article className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm, createPrivacyPlugin(labels)]} components={components}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}