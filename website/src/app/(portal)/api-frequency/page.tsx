import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading } from '@/features/documentation/components/page-heading';
import { getInventoryMarkdown } from '@/features/documentation/lib/content';

export default async function ApiFrequencyPage() {
  const markdown = await getInventoryMarkdown('polling-and-frequency-inventory.md');
  return <>
    <PageHeading eyebrow="Timing and freshness" title="API Frequency" description="Intervals and polling behavior are rendered from the frequency inventory; entries without source-confirmed timing remain explicitly unconfirmed." />
    <MarkdownDocument markdown={markdown} sourcePath="inventory/polling-and-frequency-inventory.md" />
  </>;
}