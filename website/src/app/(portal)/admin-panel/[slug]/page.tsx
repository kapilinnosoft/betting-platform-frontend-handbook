import { ModuleDocumentPage, type ModulePageProps } from '@/features/documentation/components/module-document-page';

export default function AdminModulePage(props: ModulePageProps) {
  return <ModuleDocumentPage panel="admin" {...props} />;
}
