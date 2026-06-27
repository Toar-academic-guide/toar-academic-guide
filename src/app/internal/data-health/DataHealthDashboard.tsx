import type { DataHealthReadyReport } from '@/server/data-health/queries';

interface DataHealthDashboardProps {
  adminEmail: string;
  report: DataHealthReadyReport;
}

export default function DataHealthDashboard({ adminEmail, report }: DataHealthDashboardProps) {
  const criticalItems = buildCriticalItems(report);
  const freshnessIssueCount =
    (report.freshness.totalsByStatus.changed_needs_review ?? 0) +
    (report.freshness.totalsByStatus.failed ?? 0) +
    (report.freshness.totalsByStatus.stale ?? 0) +
    (report.freshness.totalsByStatus.blocked ?? 0);

  return (
    <main
      dir="ltr"
      className="min-h-screen bg-[#f5f0e8] px-5 py-6 text-slate-950 sm:px-8 lg:px-12"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="overflow-hidden rounded-[2rem] border border-slate-950/10 bg-[#101820] p-8 text-white shadow-[0_24px_80px_rgba(16,24,32,0.18)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-200">
                Internal
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                Data Health
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
                Read-only operating view for catalogue readiness, source coverage, ingestion
                pipeline health, and review queue backlog.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm text-slate-100">
              <p className="text-slate-300">Signed in as</p>
              <p className="font-semibold">{adminEmail}</p>
              <p className="mt-3 text-slate-300">Generated</p>
              <p className="font-semibold">{formatDateTime(report.generatedAt)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <MetricCard
            label="Readiness"
            value={report.readiness.isReady ? 'Ready' : 'Needs work'}
            tone={report.readiness.isReady ? 'good' : 'bad'}
          />
          <MetricCard
            label="Missing source links"
            value={String(report.coverage.missingRequirementSourceCount)}
            tone={report.coverage.missingRequirementSourceCount === 0 ? 'good' : 'warn'}
          />
          <MetricCard
            label="Exact-ready pairs"
            value={String(report.publicAdmissions.totalsByCapability.exact ?? 0)}
            tone={(report.publicAdmissions.totalsByCapability.exact ?? 0) > 0 ? 'good' : 'warn'}
          />
          <MetricCard
            label="Failed jobs"
            value={String(report.ingestion.jobsByStatus.failed ?? 0)}
            tone={(report.ingestion.jobsByStatus.failed ?? 0) === 0 ? 'good' : 'bad'}
          />
          <MetricCard
            label="Freshness issues"
            value={String(freshnessIssueCount)}
            tone={freshnessIssueCount === 0 ? 'good' : 'warn'}
          />
          <MetricCard
            label="Pending reviews"
            value={String(report.reviewQueue.pendingCount)}
            tone={report.reviewQueue.pendingCount === 0 ? 'good' : 'warn'}
          />
        </section>

        <section className="rounded-[1.75rem] border border-red-900/15 bg-red-50 p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-700">
                Immediate attention
              </p>
              <h2 className="mt-1 text-2xl font-black text-red-950">Operational risks</h2>
            </div>
            <p className="text-sm text-red-900">{criticalItems.length} active attention items</p>
          </div>
          {criticalItems.length > 0 ? (
            <ul className="mt-5 grid gap-3 lg:grid-cols-2">
              {criticalItems.map((item) => (
                <li key={item} className="rounded-2xl bg-white px-4 py-3 text-sm text-red-950">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-red-950">
              No immediate operational risks found in the current summary.
            </p>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Catalogue readiness">
            <StatusLine
              label="Status"
              value={report.readiness.isReady ? 'Complete enough for runtime' : 'Gaps detected'}
            />
            {report.readiness.issues.length > 0 ? (
              <IssueList items={report.readiness.issues} />
            ) : (
              <p className="text-sm text-slate-600">No readiness issues detected.</p>
            )}
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Catalogue totals
            </h3>
            <DefinitionGrid
              items={[
                ['Institutions', report.readiness.counts.institutions],
                ['Programs', report.readiness.counts.programs],
                ['Program links', report.readiness.counts.programInstitutions],
                ['Requirements', report.readiness.counts.admissionRequirements],
                ['Thresholds', report.readiness.counts.admissionThresholds],
                ['Source URLs', report.readiness.counts.sourceUrls],
                ['Calculator configs', report.readiness.counts.universityCalculatorConfigs],
              ]}
            />
          </Panel>

          <Panel title="Source coverage">
            <DefinitionGrid
              items={[
                ['Requirements missing source', report.coverage.missingRequirementSourceCount],
                ['Programs missing source', report.coverage.missingProgramSourceCount],
              ]}
            />
            <CompactRows
              emptyLabel="Every requirement has a source URL."
              rows={report.coverage.missingRequirementSources.map((row) => ({
                id: row.admissionRequirementId,
                detail: `${row.programId} at ${row.institutionId}`,
              }))}
            />
          </Panel>
        </section>

        <section>
          <Panel title="Public admissions capability">
            <DefinitionGrid
              items={[
                ['Linked pairs', report.publicAdmissions.totalPairs],
                ['Exact', report.publicAdmissions.totalsByCapability.exact ?? 0],
                ['Estimated', report.publicAdmissions.totalsByCapability.estimated ?? 0],
                ['Score-only', report.publicAdmissions.totalsByCapability.score_only ?? 0],
                ['Needs input', report.publicAdmissions.totalsByCapability.needs_input ?? 0],
                ['Blocked', report.publicAdmissions.totalsByCapability.blocked ?? 0],
                ['Stale', report.publicAdmissions.totalsByCapability.stale ?? 0],
                ['Missing', report.publicAdmissions.totalsByCapability.missing ?? 0],
                ['Unsupported', report.publicAdmissions.totalsByCapability.unsupported ?? 0],
                ['Runtime degraded', report.publicAdmissions.degradedRuntimeCount],
                ['Unclassified', report.publicAdmissions.unclassifiedCount],
              ]}
            />
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Attention rows
            </h3>
            <CompactRows
              emptyLabel="Every linked pair is classified and no public gaps are surfaced."
              rows={report.publicAdmissions.rows.map((row) => ({
                id: `${row.programId}:${row.institutionId}`,
                detail: `${row.programName} @ ${row.institutionName} — ${row.capability}${
                  row.reason ? `: ${row.reason}` : ''
                }`,
              }))}
            />
          </Panel>
        </section>

        <section>
          <Panel title="Source freshness">
            <DefinitionGrid
              items={[
                ['Fresh', report.freshness.totalsByStatus.fresh ?? 0],
                ['Changed', report.freshness.totalsByStatus.changed_needs_review ?? 0],
                ['Failed', report.freshness.totalsByStatus.failed ?? 0],
                ['Stale', report.freshness.totalsByStatus.stale ?? 0],
                ['Blocked', report.freshness.totalsByStatus.blocked ?? 0],
                ['Never checked', report.freshness.totalsByStatus.never_checked ?? 0],
              ]}
            />
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Attention rows
            </h3>
            <CompactRows
              emptyLabel="No source freshness rows have been registered yet."
              rows={report.freshness.rows.map((row) => ({
                id: row.sourceId,
                detail: sourceFreshnessDetail(row),
              }))}
            />
            <p className="mt-4 text-xs text-slate-500">
              Stale means no successful check inside {report.freshness.staleAfterDays} days.
            </p>
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Ingestion pipeline">
            <CompactRows
              emptyLabel="No failed ingestion jobs."
              rows={report.ingestion.recentFailures.map((job) => ({
                id: job.id,
                detail: `${job.status} / ${job.difficulty}${job.errorText ? `: ${job.errorText}` : ''}`,
              }))}
            />
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Oldest active jobs
            </h3>
            <CompactRows
              emptyLabel="No active ingestion jobs."
              rows={report.ingestion.oldestActiveJobs.map((job) => ({
                id: job.id,
                detail: `${job.status} since ${formatDateTime(job.createdAt)}`,
              }))}
            />
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Total ingestion jobs
            </h3>
            <DefinitionGrid
              items={[
                ['Total', report.ingestion.totalJobs],
                ...Object.entries(report.ingestion.jobsByStatus),
                ...Object.entries(report.ingestion.jobsByDifficulty),
              ]}
            />
          </Panel>

          <Panel title="Review queue">
            <DefinitionGrid
              items={[
                ['Pending items', report.reviewQueue.pendingCount],
                ...Object.entries(report.reviewQueue.pendingByTargetField),
              ]}
            />
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Oldest pending item
            </h3>
            {report.reviewQueue.oldestPendingItem ? (
              <CompactRows
                rows={[
                  {
                    id: report.reviewQueue.oldestPendingItem.id,
                    detail: `${report.reviewQueue.oldestPendingItem.targetField} since ${formatDateTime(
                      report.reviewQueue.oldestPendingItem.createdAt
                    )}`,
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-600">No pending review items.</p>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'bad' | 'good' | 'warn';
  value: string;
}) {
  const toneClasses = {
    bad: 'bg-red-100 text-red-950 border-red-900/10',
    good: 'bg-emerald-100 text-emerald-950 border-emerald-900/10',
    warn: 'bg-amber-100 text-amber-950 border-amber-900/10',
  };

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </article>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-950/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function IssueList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {item}
        </li>
      ))}
    </ul>
  );
}

function DefinitionGrid({ items }: { items: Array<[string, number]> }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-100 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
          <dd className="mt-1 text-xl font-black text-slate-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CompactRows({
  emptyLabel,
  rows,
}: {
  emptyLabel?: string;
  rows: Array<{ detail: string; id: string }>;
}) {
  if (rows.length === 0) {
    return emptyLabel ? <p className="text-sm text-slate-600">{emptyLabel}</p> : null;
  }

  return (
    <ul className="grid gap-2">
      {rows.map((row) => (
        <li key={row.id} className="rounded-2xl bg-slate-100 px-4 py-3">
          <p className="text-sm font-black text-slate-950">{row.id}</p>
          <p className="mt-1 text-sm text-slate-600">{row.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function buildCriticalItems(report: DataHealthReadyReport): string[] {
  return [
    ...report.readiness.issues,
    ...report.coverage.missingRequirementSources.map(
      (row) => `Missing source URL for ${row.admissionRequirementId}`
    ),
    ...report.publicAdmissions.rows
      .filter((row) => ['blocked', 'missing', 'stale', 'unsupported'].includes(row.capability))
      .map((row) => `Public admissions ${row.capability}: ${row.programId} @ ${row.institutionId}`),
    ...report.ingestion.recentFailures.map((job) => `Failed ingestion job ${job.id}`),
    ...report.freshness.rows
      .filter((row) =>
        ['blocked', 'changed_needs_review', 'failed', 'stale'].includes(row.status)
      )
      .map((row) => `Source freshness ${row.status}: ${row.sourceId}`),
    ...(report.reviewQueue.oldestPendingItem
      ? [`Oldest pending review ${report.reviewQueue.oldestPendingItem.id}`]
      : []),
  ].slice(0, 8);
}

function sourceFreshnessDetail(row: DataHealthReadyReport['freshness']['rows'][number]): string {
  const scope = [row.institutionId, row.programId].filter(Boolean).join(' / ') || 'global source';
  const parts = [
    `${scope} / ${row.status}`,
    row.lastCheckedAt ? `checked ${formatDateTime(row.lastCheckedAt)}` : 'never checked',
    row.lastSuccessfulCheckAt ? `last success ${formatDateTime(row.lastSuccessfulCheckAt)}` : null,
    row.lastChangedAt ? `changed ${formatDateTime(row.lastChangedAt)}` : null,
    row.latestReviewItemId ? `review ${row.latestReviewItemId}` : null,
    row.reason,
    row.nextAction ? `Next: ${row.nextAction}` : null,
  ].filter(Boolean);

  return parts.join(' | ');
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}
