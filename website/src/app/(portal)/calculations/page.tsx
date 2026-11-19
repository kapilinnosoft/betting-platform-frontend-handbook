import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading, SectionHeading } from '@/features/documentation/components/page-heading';
import { getMarkdownDocument } from '@/features/documentation/lib/content';

export default async function CalculationsPage() {
  const [book, placement] = await Promise.all([
    getMarkdownDocument('docs/01-user-panel/03-game-detail/book-calculations.md'),
    getMarkdownDocument('docs/01-user-panel/03-game-detail/bet-placement-flow.md'),
  ]);
  return <>
    <PageHeading eyebrow="Verified logic" title="Calculations and Betting Logic" description="Only calculations traced in completed module documentation are shown. Client estimates are distinguished from backend settlement or enforcement behavior." />
    <MarkdownDocument markdown={book} sourcePath="docs/01-user-panel/03-game-detail/book-calculations.md" />
    <SectionHeading title="Bet placement and validation" />
    <MarkdownDocument markdown={placement} sourcePath="docs/01-user-panel/03-game-detail/bet-placement-flow.md" />
  </>;
}