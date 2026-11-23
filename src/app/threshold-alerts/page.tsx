import type { Metadata } from 'next';
import WayPageShell from '@/components/WayPageShell';
import ThresholdAlertSignup from '@/components/ThresholdAlertSignup';
import { THRESHOLD_ALERT_COPY, readThresholdAlertSelection } from '@/lib/thresholdAlerts';

export const metadata: Metadata = {
  title: 'עדכון כשמתפרסמים תנאי קבלה ל-2027',
  description: THRESHOLD_ALERT_COPY.description,
  alternates: { canonical: '/threshold-alerts' },
};

export default async function ThresholdAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ institution?: string | string[]; degree?: string | string[] }>;
}) {
  const selection = readThresholdAlertSelection(await searchParams);
  return (
    <WayPageShell>
      <main id="main-content" dir="rtl" className="px-4 py-10 text-right text-slate-900 sm:px-6">
        <section className="mx-auto flex max-w-xl flex-col gap-6">
          <h1 className="text-3xl font-black">{THRESHOLD_ALERT_COPY.heading}</h1>
          <p className="text-base leading-7 text-slate-700">{THRESHOLD_ALERT_COPY.intro}</p>
          <p className="text-sm leading-6 text-slate-600">{THRESHOLD_ALERT_COPY.scope}</p>
          <ThresholdAlertSignup
            initialInstitutions={selection.institutions}
            initialDegrees={selection.degrees}
          />
        </section>
      </main>
    </WayPageShell>
  );
}
