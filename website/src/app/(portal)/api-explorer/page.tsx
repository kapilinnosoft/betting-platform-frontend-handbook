import Link from 'next/link';
import { ApiExplorer } from '@/features/documentation/components/api-explorer';
import { PageHeading } from '@/features/documentation/components/page-heading';
import { getApiRecords } from '@/features/documentation/lib/content';
import { getPrivateLabels, privateSafeHref, redactProjectLabels } from '@/features/documentation/lib/privacy';

export default async function ApiExplorerPage() {
  const [records, labels] = await Promise.all([getApiRecords(), getPrivateLabels()]);
  const safeRecords = records.map((record) => ({
    ...record,
    name: redactProjectLabels(record.name, labels),
    aliases: record.aliases.map((value) => redactProjectLabels(value, labels)),
    endpoint: redactProjectLabels(record.endpoint, labels),
    module: redactProjectLabels(record.module, labels),
    trigger: redactProjectLabels(record.trigger, labels),
    frequency: redactProjectLabels(record.frequency, labels),
    source: redactProjectLabels(record.source, labels),
    consumers: redactProjectLabels(record.consumers, labels),
    notes: redactProjectLabels(record.notes, labels),
    verification: redactProjectLabels(record.verification, labels),
    detailHref: record.detailHref ? privateSafeHref(record.detailHref, labels) : undefined,
  }));
  return <>
    <PageHeading eyebrow="API reference" title="API Explorer" description="Search the endpoint registry and filter by panel, module, method, trigger, frequency, and verification state. Full request and response notes remain in canonical module documents.">
      <Link href="/inventory/api-inventory" className="text-sm font-semibold text-teal-800 hover:underline dark:text-teal-300">Read the full registry</Link>
    </PageHeading>
    <ApiExplorer records={safeRecords} />
  </>;
}