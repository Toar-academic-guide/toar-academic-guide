'use client';

import { useRef, useState } from 'react';
import BagrutSubjectRows, { type BagrutSubjectRow } from '@/components/BagrutSubjectRows';
import EnquiryForm from '@/components/EnquiryForm';
import { SECTORS } from '@/data/bagrutSubjects';
import { fetchAdmissionsBatch } from '@/lib/admissionsEvaluationClient';
import {
  haifaProfileInputsSchema,
  HAIFA_NUMERIC_QUALIFICATION_KEYS,
} from '@/lib/haifaAdmissionsInputs';
import { buildSekhemInput, type CalculatorOffering } from '@/lib/sekhemCalculator';
import type { BagrutCertificateType } from '@/types';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import type { HaifaQualificationValues } from '@/components/HaifaQualificationFields';
import RequiredAdmissionsInputs, { requestedHaifaKeys } from './RequiredAdmissionsInputs';
import SekhemResults from './SekhemResults';
import './sekhem.css';

const subjectNames = ['מתמטיקה', 'אנגלית', 'פיזיקה', 'מדעי המחשב'];
const emptyRows = (): BagrutSubjectRow[] =>
  subjectNames.map((label) => ({ label, units: 5, grade: '', assessmentKind: 'exam' }));

export default function SekhemCalculator({
  offerings,
  initialProgramId,
}: {
  offerings: CalculatorOffering[];
  initialProgramId?: string;
}) {
  const [rows, setRows] = useState(emptyRows);
  const [psychometric, setPsychometric] = useState('');
  const [verbal, setVerbal] = useState('');
  const [quantitative, setQuantitative] = useState('');
  const [english, setEnglish] = useState('');
  const [sector, setSector] = useState('יהודי');
  const [certificate, setCertificate] = useState<BagrutCertificateType>('other');
  const [programId, setProgramId] = useState(initialProgramId ?? '');
  const [reports, setReports] = useState<AdmissionsEvaluationReport[]>([]);
  const [haifaValues, setHaifaValues] = useState<HaifaQualificationValues>({});
  const [requiredKeys, setRequiredKeys] = useState<ReturnType<typeof requestedHaifaKeys>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [enquiry, setEnquiry] = useState<{
    offering: CalculatorOffering;
    report: AdmissionsEvaluationReport;
  } | null>(null);
  const generation = useRef(0);
  const chosen = offerings.filter((row) => !programId || row.programId === programId);
  const programs = [...new Map(offerings.map((row) => [row.programId, row.programName])).entries()];

  function invalidate() {
    generation.current++;
    setReports([]);
    setRequiredKeys([]);
    setHaifaValues({});
    setFailedIds([]);
    setError('');
    setBusy(false);
    setEnquiry(null);
  }
  async function calculate(retryIds?: string[]) {
    if (busy) return;
    const version = ++generation.current;
    setError('');
    let applicant;
    try {
      applicant = buildSekhemInput({
        rows,
        psychometric,
        verbal,
        quantitative,
        english,
        sector,
        certificate,
      });
      const numeric = new Set([
        'haifaBagrutAverage',
        'haifaBagrutYear',
        'haifaPsychometricYear',
        ...HAIFA_NUMERIC_QUALIFICATION_KEYS,
      ]);
      const extras = Object.fromEntries(
        requiredKeys
          .filter((key) => haifaValues[key]?.trim())
          .map((key) => [key, numeric.has(key) ? Number(haifaValues[key]) : haifaValues[key]]),
      );
      applicant.extraInputs = {
        ...applicant.extraInputs,
        ...haifaProfileInputsSchema.parse(extras),
      };
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== 'ZodError'
          ? cause.message
          : 'יש לבדוק את הנתונים הנוספים שהוזנו.',
      );
      return;
    }
    const ids = retryIds ?? [...new Set(chosen.map((row) => row.programId))];
    if (!ids.length) {
      setError('לא נמצאו תוכניות לחישוב.');
      return;
    }
    setBusy(true);
    const completed = retryIds ? [...reports] : [];
    const failed: string[] = [];
    if (!retryIds) setReports([]);
    try {
      for (let offset = 0; offset < ids.length; offset += 50) {
        const batch = await fetchAdmissionsBatch({
          ...applicant,
          degreeIds: ids.slice(offset, offset + 50),
        });
        if (generation.current !== version) return;
        completed.push(...Object.values(batch.reports));
        failed.push(...batch.failedDegreeIds);
        setReports([...completed]);
      }
      const keys = requestedHaifaKeys(
        completed.flatMap((report) =>
          report.results
            .filter(
              (result) => result.linkedInstitutionId === 'haifa' && result.kind === 'needs_input',
            )
            .flatMap((result) => result.requiredInputs ?? []),
        ),
      );
      setRequiredKeys(keys);
      setHaifaValues((current) =>
        Object.fromEntries(
          keys.filter((key) => current[key] !== undefined).map((key) => [key, current[key]]),
        ),
      );
      setFailedIds(failed);
      if (failed.length) setError('חלק מהתוכניות לא חושבו. אפשר לנסות שוב.');
    } catch {
      if (generation.current === version) {
        setError('לא הצלחנו לחשב כרגע. אפשר לנסות שוב.');
        setFailedIds(ids.filter((id) => !completed.some((report) => report.input.degreeId === id)));
      }
    } finally {
      if (generation.current === version) setBusy(false);
    }
  }

  return (
    <>
      <form
        className="way-surface rounded-2xl p-5 sm:p-8"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void calculate();
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">ציוני הבגרות</h2>
          <button
            type="button"
            className="min-h-11 text-sm underline"
            onClick={() => {
              invalidate();
              setRows(
                subjectNames.map((label, index) => ({
                  label,
                  units: 5,
                  grade: [90, 85, 80, 95][index],
                  assessmentKind: 'exam',
                })),
              );
              setPsychometric('700');
            }}
          >
            ערכים לדוגמה
          </button>
        </div>
        <BagrutSubjectRows
          rows={rows}
          onChange={(next) => {
            invalidate();
            setRows(next);
          }}
        />
        <details className="my-4">
          <summary className="cursor-pointer py-2 text-sm">פרטי תעודת הבגרות</summary>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              מגזר
              <select
                className="sekhem-input"
                value={sector}
                onChange={(event) => {
                  invalidate();
                  setSector(event.target.value);
                }}
              >
                {Object.keys(SECTORS).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              סוג תעודה
              <select
                className="sekhem-input"
                value={certificate}
                onChange={(event) => {
                  invalidate();
                  setCertificate(event.target.value as BagrutCertificateType);
                }}
              >
                <option value="other">אחר / לא בטוח/ה</option>
                <option value="internal">אינטרנית</option>
                <option value="external_1977_or_later">אקסטרנית (מ־1977)</option>
              </select>
            </label>
          </div>
        </details>
        <label className="block text-sm font-medium" htmlFor="psychometric-total">
          פסיכומטרי — ציון כללי{' '}
          <span aria-hidden="true" className="text-[#8c2438]">
            *
          </span>
        </label>
        <input
          id="psychometric-total"
          name="psychometric"
          className="sekhem-input mt-2"
          type="number"
          min={200}
          max={800}
          step={1}
          required
          value={psychometric}
          onChange={(event) => {
            invalidate();
            setPsychometric(event.target.value);
          }}
        />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'מילולי', value: verbal, set: setVerbal, name: 'verbal' },
            { label: 'כמותי', value: quantitative, set: setQuantitative, name: 'quantitative' },
            { label: 'אנגלית', value: english, set: setEnglish, name: 'english' },
          ].map((field) => (
            <label
              key={field.name}
              className="min-w-0 text-sm"
              htmlFor={`psychometric-${field.name}`}
            >
              {field.label}
              <input
                id={`psychometric-${field.name}`}
                name={field.name}
                className="sekhem-input mt-1"
                type="number"
                min={50}
                max={150}
                step={1}
                value={field.value}
                onChange={(event) => {
                  invalidate();
                  field.set(event.target.value);
                }}
              />
            </label>
          ))}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer py-2 text-sm">בחירת תחום לימודים</summary>
          <label className="block text-sm">
            תוכנית לימודים
            <select
              className="sekhem-input mt-1"
              value={programId}
              onChange={(event) => {
                invalidate();
                setProgramId(event.target.value);
              }}
            >
              <option value="">כל התוכניות</option>
              {programs.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </details>
        <RequiredAdmissionsInputs
          keys={requiredKeys}
          values={haifaValues}
          onChange={(key, value) => setHaifaValues((current) => ({ ...current, [key]: value }))}
          disabled={busy}
        />
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#8c2438]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="way-button-primary mt-5 min-h-12 w-full px-5 py-3"
        >
          {busy ? 'מחשבים…' : 'לחשב את הסכם'}
        </button>
        {busy && (
          <p role="status" className="sr-only">
            החישוב מתבצע
          </p>
        )}
        <p className="mt-3 text-sm leading-6 text-(--text-body)">
          ממוצע הבגרות מחושב לפי כללי המוסד כשאפשר; אחרת מוצג אומדן.
        </p>
        <p className="mt-1 text-sm text-(--text-body)">השימוש במחשבון בחינם</p>
      </form>
      {reports.length > 0 && (
        <SekhemResults
          reports={reports}
          offerings={chosen}
          onEnquiry={(offering, report) => setEnquiry({ offering, report })}
        />
      )}
      {!busy && failedIds.length > 0 && (
        <button
          className="way-button-secondary mt-4 px-5 py-3"
          onClick={() => void calculate(failedIds)}
        >
          לנסות שוב
        </button>
      )}
      {enquiry && (
        <EnquiryForm
          programId={enquiry.offering.programId}
          institutionId={enquiry.offering.institutionId}
          title={`${enquiry.offering.programName} · ${enquiry.offering.institutionName}`}
          surface="sekhem_calculator"
          evaluationInput={{ ...enquiry.report.input, degreeId: enquiry.offering.programId }}
          onBack={() => setEnquiry(null)}
        />
      )}
    </>
  );
}
