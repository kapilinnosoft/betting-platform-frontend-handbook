import type { ReactNode } from 'react';
import { getDocumentedModules } from '@/features/documentation/lib/content';
import { Sidebar } from '@/shared/components/common/sidebar';
import { Navbar } from '@/shared/components/common/navbar';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const [userModules, adminModules] = await Promise.all([getDocumentedModules('user'), getDocumentedModules('admin')]);
  const modules = [...userModules, ...adminModules];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:flex">
      <Sidebar modules={modules} />
      <div className="min-w-0 flex-1">
        <Navbar />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}