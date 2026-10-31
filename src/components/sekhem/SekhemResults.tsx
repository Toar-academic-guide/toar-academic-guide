'use client';

import {
  formatSekhemNumber,
  resultPresentation,
  type ResultInputTarget,
} from '@/lib/sekhemResultPresentation';
import { useState } from 'react';
import Link from 'next/link';
import type { CalculatorOffering } from '@/lib/sekhemCalculator';
import type {
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';

type Entry = {
  offering: CalculatorOffering;
  report: AdmissionsEvaluationReport;
  result: AdmissionsEvaluationResult;
  actionOnly?: boolean;
};
type InputFocus = (target: ResultInputTarget) => void;
type Enquiry = (offering: CalculatorOffering, report: AdmissionsEvaluationReport) => void;
const noScoreInstitutions = new Set(['biu', 'afeka', 'hit']);
const hasNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const hasResultNumber = (entry: Entry) =>
  hasNumber(entry.result.score) || hasNumber(entry.result.threshold);

function groupEntry(entries: Entry[], selected?: string): Entry {
  return (
    entries.find((entry) => entry.offering.programId === selected) ??
    entries.find((entry) => hasNumber(entry.result.score)) ??
    entries.find(hasResultNumber) ??
    entries[0]
  );
}

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
    const numberlessGate = [result.sourceLabel, ...result.explanation.split(/[.;,]/)]
      .map((text) => text.trim())
      .find((text) => namesGate.test(text) && !/\d/.test(text));
    const text = textOnly && /\d/.test(result.explanation) ? numberlessGate : result.explanation;
    if (text) labels.push(text);
  }
  return labels
    .map((label) => label.replace(/מתואם|סכם|מצרף/g, 'ציון הקבלה'))
    .filter(
      (label) =>
        !/נדרשת בדיקה מול המוסד|מקור חסום|ממוצע בגרות רשמי של חיפה|נתונים|[a-z]+_[a-z_]+/i.test(
          label,
        ),
    );
}

function haifaReasons(result: AdmissionsEvaluationResult): string[] {
  if (result.linkedInstitutionId !== 'haifa') return [];
  return [...new Set([result.explanation, result.estimationReason])]
    .filter(
      (text): text is string =>
        typeof text === 'string' &&
        Boolean(text.trim()) &&
        /[א-ת]/.test(text) &&
        !/[a-z_]|מיפוי|טרם אומת|מקור חסום|עדיין לא מחשבים כאן|ציון הקבלה חושב לפי נוסחת/i.test(
          text,
        ),
    )
    .map((text) => text.trim().replace(/מתואם|סכם|מצרף/g, 'ציון הקבלה'));
}

function InstitutionGroup({
  entries,
  entry,
  onSelect,
  onEnquiry,
  onInputFocus,
}: {
  entries: Entry[];
  entry: Entry;
  onSelect: (programId: string) => void;
  onEnquiry: Enquiry;
  onInputFocus?: InputFocus;
}) {
  const { offering, report, result } = entry;
  const numberless = !hasResultNumber(entry);
  const gates = numberless && offering.institutionId === 'haifa' ? [] : gateText(result);
  const score = hasNumber(result.score);
  const threshold = hasNumber(result.threshold);
  const presentation = resultPresentation(result);
  const reasons = haifaReasons(result);
  const resultText = numberless && reasons.length ? reasons[0] : presentation.text;
  const scoreOnly = presentation.text === null;
  // Accepted floor-only routes have one unambiguous line. A text-only manual gate
  // instead carries the actual returned gate, without a generic fallback sentence.
  const acceptedWithoutNumbers =
    numberless &&
    !result.requiredInputs?.length &&
    (result.decision === 'accepted' || result.scoreAssessment === 'meets_threshold') &&
    result.decision !== 'below' &&
    result.scoreAssessment !== 'below_threshold';
  const visibleGates =
    scoreOnly || acceptedWithoutNumbers || result.decision === 'below' ? [] : gates;
  const textOnlyGate = numberless && visibleGates.length > 0 && result.kind === 'manual_gate';
  return (
    <section
      data-testid={`${entry.actionOnly ? 'programme-actions' : 'institution'}-${offering.institutionId}`}
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
                onChange={(event) => onSelect(event.target.value)}
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
          {!numberless && offering.programPath && (
            <Link
              className="mt-2 inline-block text-sm underline underline-offset-4"
              href={offering.programPath}
            >
              לתנאי הקבלה של התוכנית
            </Link>
          )}
        </div>
        {!entry.actionOnly && (
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
                  <span className="text-sm text-(--text-body)">
                    {result.kind === 'estimated' ? 'ציון הקבלה המשוער' : 'ציון הקבלה'}
                  </span>
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
            {!scoreOnly && !textOnlyGate && (
              <p
                data-result-reason={numberless ? '' : undefined}
                className={`mt-3 font-medium ${presentation.tone === 'positive' ? 'text-[#206345]' : presentation.tone === 'negative' ? 'text-[#8c2438]' : ''}`}
              >
                {resultText}
                {presentation.actions?.map((action, index) => (
                  <span key={action.label}>
                    {index > 0 && ' וב'}
                    <button
                      type="button"
                      className="underline underline-offset-4"
                      onClick={() => onInputFocus?.(action.target)}
                    >
                      {action.label}
                    </button>
                  </span>
                ))}
              </p>
            )}
            {visibleGates.map((gate) => (
              <p key={gate} data-result-reason className="mt-2 text-sm text-(--text-body)">
                {gate}
              </p>
            ))}
            {reasons
              .filter((reason) => reason !== resultText && !visibleGates.includes(reason))
              .map((reason) => (
                <p key={reason} data-result-reason className="mt-2 text-sm text-(--text-body)">
                  {reason}
                </p>
              ))}
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="way-button-primary min-h-11 px-5 py-3"
          onClick={() => onEnquiry(offering, report)}
        >
          קבלו שיחה מהמוסד
        </button>
        {numberless && offering.programPath && (
          <Link
            className="way-button-secondary inline-flex min-h-11 items-center px-5 py-3"
            href={offering.programPath}
          >
            לתנאי הקבלה של התוכנית
          </Link>
        )}
      </div>
    </section>
  );
}

export default function SekhemResults({
  reports,
  offerings,
  onEnquiry,
  onInputFocus,
}: {
  reports: AdmissionsEvaluationReport[];
  offerings: CalculatorOffering[];
  onEnquiry: Enquiry;
  onInputFocus?: InputFocus;
}) {
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, string>>({});
  const groups = new Map<string, Entry[]>();
  const normalEntries: Entry[] = [];
  const filteredEntries: Entry[] = [];
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
    let actionOnly = false;
    if (noScoreInstitutions.has(offering.institutionId) && !hasNumber(result.score)) {
      afeka ||= offering.institutionId === 'afeka';
      // Keep actionable floor verdicts and their explicit lead targets, without blank-score badges.
      actionOnly = !['accepted', 'below'].includes(result.decision) && !gateText(result).length;
    }
    (actionOnly ? filteredEntries : normalEntries).push({ offering, report, result, actionOnly });
  }
  for (const entry of normalEntries.length ? normalEntries : filteredEntries) {
    const id = entry.offering.institutionId;
    const entries = groups.get(id) ?? [];
    entries.push(entry);
    groups.set(id, entries);
  }
  return (
    <section aria-labelledby="sekhem-results-title" className="mt-12">
      <h2 id="sekhem-results-title" className="text-2xl font-semibold">
        הסכם לפי מוסד ותוכנית
      </h2>
      {[...groups.entries()]
        .map(([id, entries]) => ({ id, entries, entry: groupEntry(entries, selectedPrograms[id]) }))
        .sort((a, b) => Number(hasResultNumber(b.entry)) - Number(hasResultNumber(a.entry)))
        .map(({ id, entries, entry }) => (
          <InstitutionGroup
            key={id}
            entries={entries}
            entry={entry}
            onSelect={(programId) =>
              setSelectedPrograms((current) => ({ ...current, [id]: programId }))
            }
            onEnquiry={onEnquiry}
            onInputFocus={onInputFocus}
          />
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
