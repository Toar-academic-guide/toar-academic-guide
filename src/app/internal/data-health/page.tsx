import { notFound } from 'next/navigation';

import WayPageShell from '@/components/WayPageShell';
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
      <WayPageShell dir="ltr" showLogo>
        <main className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-12 text-[#445274]">
          <section className="max-w-xl rounded-[1.7rem] border border-white bg-white/82 p-8 shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#7784e8]">
              Internal setup required
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#0c1d45]">Data health unavailable</h1>
            <p className="mt-4 text-[#647091]">{report.message}</p>
            <p className="mt-4 text-sm text-[#6f7a99]">
              Configure the read-only operational database connection before using this dashboard.
            </p>
          </section>
        </main>
      </WayPageShell>
    );
  }

  return (
    <DataHealthDashboard adminEmail={authorization.user.email ?? 'unknown admin'} report={report} />
  );
}
