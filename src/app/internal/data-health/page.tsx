import { notFound } from 'next/navigation';

import { getDataHealthReport } from '@/server/data-health/queries';
import { getInternalAdminAuthorization } from '@/server/internal/adminAuth';
import DataHealthDashboard from './DataHealthDashboard';

export const dynamic = 'force-dynamic';

export default async function DataHealthPage() {
  const authorization = await getInternalAdminAuthorization();

  if (!authorization.isAdmin) {
    notFound();
  }

  const report = await getDataHealthReport();

  if (report.status === 'unavailable') {
    return (
      <main
        dir="ltr"
        className="flex min-h-screen items-center justify-center bg-[#f5f0e8] px-6 text-slate-950"
      >
        <section className="max-w-xl rounded-[2rem] border border-amber-900/15 bg-amber-50 p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-700">
            Internal setup required
          </p>
          <h1 className="mt-3 text-3xl font-black">Data health unavailable</h1>
          <p className="mt-4 text-slate-700">{report.message}</p>
          <p className="mt-4 text-sm text-slate-600">
            Configure the read-only operational database connection before using this dashboard.
          </p>
        </section>
      </main>
    );
  }

  return (
    <DataHealthDashboard adminEmail={authorization.user.email ?? 'unknown admin'} report={report} />
  );
}
