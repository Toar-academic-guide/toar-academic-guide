import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getReviewItemDetail } from '@/server/data-health/queries';
import { getInternalAdminAuthorization } from '@/server/internal/adminAuth';
import ReviewActionPanel from './ReviewActionPanel';

export const dynamic = 'force-dynamic';

interface ReviewItemPageProps {
  params: Promise<{
    reviewItemId: string;
  }>;
}

export default async function ReviewItemPage({ params }: ReviewItemPageProps) {
  const authorization = await getInternalAdminAuthorization();

  if (!authorization.isAdmin) {
    notFound();
  }

  const { reviewItemId } = await params;
  const detail = await getReviewItemDetail(reviewItemId);

  if (detail.status === 'not_found') {
    notFound();
  }

  const item = detail.item;

  return (
    <main dir="ltr" className="min-h-screen bg-[#f5f0e8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-slate-950/10 bg-[#101820] p-8 text-white shadow-[0_24px_80px_rgba(16,24,32,0.18)]">
          <Link
            className="text-sm font-bold text-amber-200 underline-offset-4 hover:underline"
            href="/internal/data-health"
          >
            Back to data health
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.35em] text-amber-200">
            Internal review
          </p>
          <h1 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-5xl">
            {item.id}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-200">
            Inspect bounded evidence here. GitHub pull-request merge is the only approval surface for
            admissions changes; this screen can only resolve an investigation with no canonical change.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <FactCard label="Target field" value={item.targetField} />
          <FactCard label="Status" value={item.status} />
          <FactCard label="Created" value={formatDateTime(item.createdAt)} />
        </section>

        <ReviewActionPanel
          canReject={item.actionEligibility.canReject}
          reviewItemId={item.id}
        />

        <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Panel title="Review context">
            <DefinitionList
              rows={[
                ['Payload', item.payloadId],
                [
                  'Payload created',
                  item.payloadCreatedAt ? formatDateTime(item.payloadCreatedAt) : 'unknown',
                ],
                ['Requirement', item.admissionRequirementId ?? 'not linked'],
                ['Reviewed', item.reviewedAt ? formatDateTime(item.reviewedAt) : 'not reviewed'],
              ]}
            />
          </Panel>

          <Panel title="Source evidence">
            <DefinitionList
              rows={[
                ['Source', item.evidence.sourceId ?? 'unknown'],
                ['Institution', item.evidence.institutionId ?? 'not linked'],
                ['Program', item.evidence.programId ?? 'not linked'],
                ['URL', item.evidence.sourceUrl ?? 'unknown'],
                ['Class', item.evidence.sourceClass ?? 'unknown'],
                ['Capability', item.evidence.capability ?? 'unknown'],
                ['Freshness status', item.evidence.freshnessStatus ?? 'unknown'],
                ['Current review pointer', item.evidence.latestReviewItemId ?? 'none'],
                ['Fingerprint', item.evidence.normalizedFingerprint ?? 'none'],
              ]}
            />
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Normalized decision payload">
            {item.evidence.normalizedDecisionPayload.length > 0 ? (
              <dl className="grid gap-3">
                {item.evidence.normalizedDecisionPayload.map((entry) => (
                  <div key={entry.key} className="rounded-2xl bg-slate-100 px-4 py-3">
                    <dt className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      {entry.key}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-slate-800">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-600">No normalized decision payload is available.</p>
            )}
          </Panel>

          <Panel title="Operator notes">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Reproduced fields
            </h3>
            <CompactList
              emptyLabel="No reproduced fields were recorded."
              items={item.evidence.reproducedFields}
            />
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Limitations
            </h3>
            <CompactList
              emptyLabel="No limitations were recorded."
              items={item.evidence.limitations}
            />
            {item.evidence.nextAction ? (
              <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Next action: {item.evidence.nextAction}
              </p>
            ) : null}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-950/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-950/10 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DefinitionList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-100 px-4 py-3">
          <dt className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CompactList({ emptyLabel, items }: { emptyLabel: string; items: string[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-slate-600">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-3 grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
          {item}
        </li>
      ))}
    </ul>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}
