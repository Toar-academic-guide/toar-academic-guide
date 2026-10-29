'use client';

import { useEffect, useRef, useState } from 'react';
import BagrutSubjectRows, {
  type BagrutSubjectRow,
  type BagrutFieldErrors,
} from '@/components/BagrutSubjectRows';
import EnquiryForm from '@/components/EnquiryForm';
import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import { institutionShortName, type ResultInputTarget } from '@/lib/sekhemResultPresentation';
import { readSekhemSession, writeSekhemSession } from '@/lib/sekhemCalculatorSession';
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
const exampleRows = (): BagrutSubjectRow[] =>
  (
    [
      ['מתמטיקה', 5, 92],
      ['אנגלית', 5, 95],
      ['הבעה עברית', 2, 88],
      ['תנ״ך', 2, 85],
      ['ספרות', 2, 90],
      ['היסטוריה / תע״י', 2, 87],
      ['אזרחות', 2, 93],
      ['פיזיקה', 5, 90],
      ['מדעי המחשב', 5, 94],
    ] as const
  ).map(([label, units, grade]) => ({ label, units, grade, assessmentKind: 'exam' }));
const numericHaifaKeys = new Set([
  'haifaBagrutAverage',
  'haifaBagrutYear',
  'haifaPsychometricYear',
  ...HAIFA_NUMERIC_QUALIFICATION_KEYS,
]);
const booleanHaifaKeys = new Set([
  'haifaOtUnjustifiedAbsence',
  'haifaInformationSystemsPartnerRequirementsConfirmed',
]);

function numericRowErrors(rows: BagrutSubjectRow[]): BagrutFieldErrors {
  return rows.map((row) => {
    const errors: BagrutFieldErrors[number] = {};
    for (const [field, min, max, message] of [
      ['units', 1, 5, 'יחידות בין 1 ל-5'],
      ['grade', 0, 100, 'ציון בין 0 ל-100'],
    ] as const) {
      const value = row[field];
      if (value !== '' && (!Number.isInteger(value) || value < min || value > max))
        errors[field] = message;
    }
    return errors;
  });
}

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
  const [fieldErrors, setFieldErrors] = useState<BagrutFieldErrors>([]);
  const [restoredFor, setRestoredFor] = useState<{
    offerings: CalculatorOffering[];
    initialProgramId?: string;
  } | null>(null);
  const subjectFields = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ index: number; field: 'grade' | 'units' } | null>(null);
  function focusSubject(index: number, field: 'grade' | 'units') {
    const label = `${field === 'grade' ? 'ציון' : 'יחידות'} ${index + 1}`;
    const input = subjectFields.current?.querySelector<HTMLInputElement>(`[aria-label="${label}"]`);
    input?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    input?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const target = pendingFocus.current;
    if (target) {
      focusSubject(target.index, target.field);
      pendingFocus.current = null;
    }
  }, [rows, fieldErrors]);

  function focusResultInput(target: ResultInputTarget) {
    if ('inputId' in target) {
      const input = document.getElementById(target.inputId);
      input?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      input?.focus({ preventScroll: true });
      return;
    }
    const index = rows.findIndex(
      (row) => subjectIdForWizardLabel(row.label) === subjectIdForWizardLabel(target.subject),
    );
    if (index >= 0) focusSubject(index, target.field);
    else {
      invalidate();
      pendingFocus.current = { index: rows.length, field: target.field };
      setRows([...rows, { label: target.subject, units: '', grade: '', assessmentKind: 'exam' }]);
    }
  }
  const generation = useRef(0);
  const chosen = offerings.filter((row) => !programId || row.programId === programId);
  const programs = [
    ...new Map(
      offerings.map((row) => [
        row.programId,
        `${row.programName} · ${institutionShortName(row.institutionId, row.institutionName)}`,
      ]),
    ).entries(),
  ];

  useEffect(() => {
    const saved = readSekhemSession(offerings);
    const explicit = offerings.some((row) => row.programId === initialProgramId)
      ? initialProgramId
      : undefined;
    if (saved) {
      setRows(saved.rows);
      setPsychometric(saved.psychometric);
      setVerbal(saved.verbal);
      setQuantitative(saved.quantitative);
      setEnglish(saved.english);
      setSector(saved.sector);
      setCertificate(saved.certificate);
      const compatible = !explicit || explicit === saved.programId;
      setProgramId(explicit ?? saved.programId);
      setReports(compatible ? saved.reports : []);
      setRequiredKeys(compatible ? saved.requiredKeys : []);
      setHaifaValues(compatible ? saved.haifaValues : {});
      setFailedIds(compatible ? saved.failedIds : []);
    } else if (explicit) {
      setProgramId(explicit);
      setReports([]);
      setRequiredKeys([]);
      setHaifaValues({});
      setFailedIds([]);
    }
    generation.current++;
    setBusy(false);
    setError('');
    setEnquiry(null);
    setRestoredFor({ offerings, initialProgramId });
  }, [offerings, initialProgramId]);

  useEffect(() => {
    if (restoredFor?.offerings !== offerings || restoredFor.initialProgramId !== initialProgramId)
      return;
    const snapshot = {
      rows,
      psychometric,
      verbal,
      quantitative,
      english,
      sector,
      certificate,
      programId,
      reports,
      requiredKeys,
      haifaValues,
      failedIds,
    };
    const save = () => writeSekhemSession(snapshot);
    save();
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, [
    restoredFor,
    offerings,
    initialProgramId,
    rows,
    psychometric,
    verbal,
    quantitative,
    english,
    sector,
    certificate,
    programId,
    reports,
    requiredKeys,
    haifaValues,
    failedIds,
  ]);

  function invalidate(keepRequired = false) {
    generation.current++;
    setReports([]);
    if (!keepRequired) {
      setRequiredKeys([]);
      setHaifaValues({});
    }
    setFailedIds([]);
    setError('');
    setBusy(false);
    setEnquiry(null);
  }
  async function calculate(retryIds?: string[]) {
    if (busy) return;
    const version = ++generation.current;
    setError('');
    const errors = numericRowErrors(rows);
    const index = errors.findIndex((row) => row.units || row.grade);
    if (index >= 0) {
      pendingFocus.current = { index, field: errors[index].units ? 'units' : 'grade' };
      setFieldErrors(errors);
      return;
    }
    setFieldErrors([]);
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
      const extras = Object.fromEntries(
        requiredKeys
          .filter((key) => haifaValues[key]?.trim())
          .map((key) => {
            const value = haifaValues[key];
            if (numericHaifaKeys.has(key)) return [key, Number(value)];
            if (booleanHaifaKeys.has(key)) return [key, value === 'true'];
            return [key, value];
          }),
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
              setRows(exampleRows());
              setFieldErrors([]);
              setPsychometric('700');
              setVerbal('130');
              setQuantitative('140');
              setEnglish('135');
            }}
          >
            ערכים לדוגמה
          </button>
        </div>
        <div ref={subjectFields} id="sekhem-bagrut-subjects" tabIndex={-1}>
          <BagrutSubjectRows
            rows={rows}
            fieldErrors={fieldErrors}
            onChange={(next) => {
              invalidate();
              setRows(next);
              if (fieldErrors.length) setFieldErrors(numericRowErrors(next));
            }}
          />
        </div>
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
          onChange={(key, value) => {
            invalidate(true);
            setHaifaValues((current) => ({ ...current, [key]: value }));
          }}
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
          onInputFocus={focusResultInput}
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
