import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading } from '@/features/documentation/components/page-heading';
import { getInventoryMarkdown } from '@/features/documentation/lib/content';

export default async function TeamReviewPage() {
  const markdown = await getInventoryMarkdown('open-questions.md');
  return <>
    <PageHeading eyebrow="Review status" title="Team Review" description="Open findings and backend-confirmation items from the canonical question inventory. This view is read-only; no review comments are stored." />
    <MarkdownDocument markdown={markdown} sourcePath="inventory/open-questions.md" />
  </>;
}