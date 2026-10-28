'use client';

import {
  formatSekhemNumber,
  resultInputReasons,
  resultSourceReason,
} from '@/lib/sekhemResultPresentation';
import { useState } from 'react';
import Link from 'next/link';
import { resultVerdict, type CalculatorOffering } from '@/lib/sekhemCalculator';
import type {
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';

type Entry = {
  offering: CalculatorOffering;
  report: AdmissionsEvaluationReport;
  result: AdmissionsEvaluationResult;
};
type Enquiry = (offering: CalculatorOffering, report: AdmissionsEvaluationReport) => void;
const noScoreInstitutions = new Set(['biu', 'afeka', 'hit']);
const hasNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function gateText(result: AdmissionsEvaluationResult): string[] {
  const labels =
    result.additionalConditions
      ?.filter((condition) => condition.status !== 'confirmed')
      .map((condition) => condition.label) ?? [];
  // Text-only routes (including HUJI Kidum) deliberately have no numerical fields.
  const namesGate = /ראיון|ריאיון|מבחן|תיק עבודות|אודישן|ראויים לקידום|האגודה לקידום/;
  if (result.kind === 'manual_gate' && !labels.length && namesGate.test(result.explanation)) {
    const textOnly = !hasNumber(result.score) && !hasNumber(result.threshold);
    // The returned route name preserves a deliberately number-free gate even
    // when its longer explanation mentions a suppressed score band.
    labels.push(
      textOnly && /\d/.test(result.explanation) && namesGate.test(result.sourceLabel)
        ? result.sourceLabel
        : result.explanation,
    );
  }
  return labels.filter((label) => !label.includes('נדרשת בדיקה מול המוסד'));
}

function InstitutionGroup({ entries, onEnquiry }: { entries: Entry[]; onEnquiry: Enquiry }) {
  const [selected, setSelected] = useState<string>();
  const { offering, report, result } =
    entries.find((entry) => entry.offering.programId === selected) ??
    entries.find((entry) => hasNumber(entry.result.score)) ??
    entries[0];
  const gates = gateText(result);
  const score = hasNumber(result.score);
  const threshold = hasNumber(result.threshold);
  const reasons = resultInputReasons(result);
  if (!score && !gates.length && !reasons.length)
    reasons.push({ text: resultSourceReason(result) });
  const verdict =
    result.kind === 'manual_gate' && !score && !threshold && !gates.length
      ? 'חסרים נתונים לחישוב'
      : resultVerdict(result);
  return (
    <section
      data-testid={`institution-${offering.institutionId}`}
      className="border-b border-(--border) py-7"
    >
      <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-lg font-semibold">{offering.institutionName}</h3>
          {entries.length > 1 ? (
            <label className="mt-3 block text-sm">
              בחירת תוכנית
              <select
                className="sekhem-input mt-1"
                value={offering.programId}
                onChange={(event) => setSelected(event.target.value)}
              >
                {entries.map((entry) => (
                  <option key={entry.offering.programId} value={entry.offering.programId}>
                    {entry.offering.programName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-1 text-(--text-body)">{offering.programName}</p>
          )}
        </div>
        <div
          data-testid={`result-${offering.programId}-${offering.institutionId}`}
          data-kind={result.kind}
          data-capability={result.capability}
          data-decision={result.decision}
        >
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            {score && (
              <div>
                <span
                  data-result-number="score"
                  dir="ltr"
                  className="block text-3xl font-semibold tabular-nums"
                >
                  {formatSekhemNumber(result.score!, offering.institutionId)}
                </span>
                {result.scoreLabel && (
                  <span className="text-sm text-(--text-body)">{result.scoreLabel}</span>
                )}
              </div>
            )}
            {threshold && (
              <div>
                <span className="block text-sm text-(--text-body)">סף קבלה</span>
                <span data-result-number="threshold" dir="ltr" className="tabular-nums">
                  {formatSekhemNumber(result.threshold!, offering.institutionId)}
                </span>
              </div>
            )}
          </div>
          <p
            className={`mt-3 font-medium ${verdict === 'הציונים עומדים בתנאי הקבלה' ? 'text-[#206345]' : verdict === 'הציונים מתחת לסף' ? 'text-[#8c2438]' : ''}`}
          >
            {verdict}
          </p>
          {gates.map((gate) => (
            <p key={gate} data-result-reason className="mt-2 text-sm text-(--text-body)">
              {gate}
            </p>
          ))}
          {reasons.map((reason) => (
            <p key={reason.text} data-result-reason className="mt-2 text-sm text-(--text-body)">
              {reason.href ? (
                <a className="underline underline-offset-4" href={reason.href}>
                  {reason.text}
                </a>
              ) : (
                reason.text
              )}
            </p>
          ))}
          {offering.institutionId === 'reichman' && (
            <p className="mt-2 text-sm text-(--text-body)">אומדן, עד לאישור המוסד</p>
          )}
        </div>
      </div>
      <button
        type="button"
        className="way-button-primary mt-5 min-h-11 px-5 py-3"
        onClick={() => onEnquiry(offering, report)}
      >
        קבלת מידע על התוכנית
      </button>
    </section>
  );
}

export default function SekhemResults({
  reports,
  offerings,
  onEnquiry,
}: {
  reports: AdmissionsEvaluationReport[];
  offerings: CalculatorOffering[];
  onEnquiry: Enquiry;
}) {
  const groups = new Map<string, Entry[]>();
  let uncomputable = false;
  let afeka = false;
  for (const offering of offerings) {
    if (offering.institutionId === 'ariel') continue;
    const report = reports.find(
      (item) =>
        (item.input.degreeId === offering.programId || item.program.id === offering.programId) &&
        item.results.some((row) => row.linkedInstitutionId === offering.institutionId),
    );
    const result = report?.results.find(
      (item) => item.linkedInstitutionId === offering.institutionId,
    );
    if (!report || !result) continue;
    if (noScoreInstitutions.has(offering.institutionId) && !hasNumber(result.score)) {
      uncomputable = true;
      afeka ||= offering.institutionId === 'afeka';
      // Keep actionable floor verdicts and their explicit lead targets, without blank-score badges.
      if (!['accepted', 'below'].includes(result.decision) && !gateText(result).length) continue;
    }
    const entries = groups.get(offering.institutionId) ?? [];
    entries.push({ offering, report, result });
    groups.set(offering.institutionId, entries);
  }
  return (
    <section aria-labelledby="sekhem-results-title" className="mt-12">
      <h2 id="sekhem-results-title" className="text-2xl font-semibold">
        הסכם לפי מוסד ותוכנית
      </h2>
      {uncomputable && (
        <p className="mt-4 text-(--text-body)">בחלק מהמוסדות נבדקים תנאי קבלה בלי חישוב סכם.</p>
      )}
      {[...groups.entries()].map(([id, entries]) => (
        <InstitutionGroup key={id} entries={entries} onEnquiry={onEnquiry} />
      ))}
      {afeka && (
        <Link
          className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4"
          href="/institutions/afeka"
        >
          יש גם אפיקי קבלה נוספים
        </Link>
      )}
    </section>
  );
}
