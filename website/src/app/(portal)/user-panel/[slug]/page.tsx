import { ModuleDocumentPage, type ModulePageProps } from '@/features/documentation/components/module-document-page';

export default function ModulePage(props: ModulePageProps) {
  return <ModuleDocumentPage panel="user" {...props} />;
}
