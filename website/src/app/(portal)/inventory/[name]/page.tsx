import { notFound } from 'next/navigation';
import { MarkdownDocument } from '@/features/documentation/components/markdown-document';
import { PageHeading } from '@/features/documentation/components/page-heading';
import { getInventoryMarkdown, getInventoryTitle, inventoryPageNames, isInventoryPage } from '@/features/documentation/lib/content';
import { getPrivateLabels, redactProjectLabels } from '@/features/documentation/lib/privacy';

export function generateStaticParams() {
  return inventoryPageNames().map((name) => ({ name }));
}

export const dynamicParams = false;

export default async function InventoryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = `${name}.md`;
  if (!isInventoryPage(file)) notFound();
  const [markdown, title, labels] = await Promise.all([getInventoryMarkdown(file), getInventoryTitle(file), getPrivateLabels()]);

  return <>
    <PageHeading eyebrow="Inventory" title={redactProjectLabels(title, labels)} description="Rendered from the canonical inventory file. Section links from module documents land here." />
    <MarkdownDocument markdown={markdown} sourcePath={`inventory/${file}`} />
  </>;
}
