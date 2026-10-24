'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { ALL_SUBJECTS, SECTORS } from '@/data/bagrutSubjects';
import {
  buildBagrutSubjectRecord,
  subjectIdForWizardLabel,
  type BagrutWizardSubjectInput,
} from '@/utils/bagrutSubjectRecord';
import type { BagrutCertificateType, BagrutSector, BagrutSubjectRecord } from '@/types';

const SECTOR_LABELS: Record<BagrutSector, string> = {
  jewish: 'יהודי',
  arab: 'ערבי',
  druze: 'דרוזי',
  circassian: 'צרקסי',
  bedouin: 'בדואי',
  samaritan: 'שומרוני',
};
const labels = [
  ...new Set([
    ...ALL_SUBJECTS,
    ...Object.values(SECTORS).flatMap((items) => items.map((item) => item.n)),
  ]),
];
const labelById = new Map(labels.map((label) => [subjectIdForWizardLabel(label), label]));
const starterRows = new Set(
  Object.values(SECTORS).flatMap((items) => items.map((item) => `${item.n}|${item.min}`)),
);
// A row the student never filled: an empty added row, or an untouched starter row.
const isBlankRow = (row: BagrutWizardSubjectInput) =>
  row.grade === '' &&
  (row.assessmentKind ?? 'exam') === 'exam' &&
  (row.label.trim() === '' || starterRows.has(`${row.label}|${row.units}`));
const emptyRows = (sector: string): BagrutWizardSubjectInput[] =>
  SECTORS[sector].map((subject) => ({
    label: subject.n,
    units: subject.min,
    grade: '',
    assessmentKind: 'exam',
  }));

export default function JourneyExactGrades({
  initialRecord,
  onComplete,
}: {
  initialRecord?: BagrutSubjectRecord;
  onComplete: (record: BagrutSubjectRecord) => void;
}) {
  const [sector, setSector] = useState(
    initialRecord ? SECTOR_LABELS[initialRecord.sector] : 'יהודי',
  );
  const [certificate, setCertificate] = useState<BagrutCertificateType | ''>(
    initialRecord?.schemaVersion === 2 ? initialRecord.certificateType : '',
  );
  const [complete, setComplete] = useState(
    initialRecord?.schemaVersion === 2 ? initialRecord.complete : false,
  );
  const [rows, setRows] = useState<BagrutWizardSubjectInput[]>(
    () =>
      initialRecord?.subjects.map((subject) => ({
        label: labelById.get(subject.subjectId) ?? subject.subjectId,
        units: subject.units,
        grade: subject.grade,
        assessmentKind: 'assessmentKind' in subject ? subject.assessmentKind : 'exam',
      })) ?? emptyRows('יהודי'),
  );
  const [error, setError] = useState('');
  const [reading, setReading] = useState('');
  const [imported, setImported] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const change = (index: number, updates: Partial<BagrutWizardSubjectInput>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  return (
    <form
      className="journey-narrow"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        if (imported && !reviewed) {
          setError('יש לבדוק את הציונים שזוהו ולאשר אותם.');
          return;
        }
        const filledRows = rows.filter((row) => !isBlankRow(row));
        const record = buildBagrutSubjectRecord({
          sectorLabel: sector,
          certificateType: certificate || 'other',
          complete,
          subjects: filledRows,
        });
        if (!filledRows.length || record.subjects.length !== filledRows.length) {
          setError('יש להשלים את המקצוע, היחידות והציון בכל שורה ולוודא שאין כפילויות.');
          return;
        }
        onComplete(record);
      }}
    >
      <div className="journey-exact-top">
        <label>
          מגזר
          <select
            value={sector}
            onChange={(event) => {
              const nextSector = event.target.value;
              const defaults = emptyRows(sector);
              const untouched =
                rows.length === defaults.length &&
                rows.every(
                  (row, index) =>
                    row.label === defaults[index].label &&
                    row.units === defaults[index].units &&
                    row.grade === '' &&
                    row.assessmentKind === defaults[index].assessmentKind,
                );
              if (untouched) setRows(emptyRows(nextSector));
              setSector(nextSector);
            }}
            required
          >
            {Object.keys(SECTORS).map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          סוג תעודה
          <select
            required
            value={certificate}
            onChange={(event) => setCertificate(event.target.value as BagrutCertificateType)}
          >
            <option value="">בחירה</option>
            <option value="internal">אינטרנית</option>
            <option value="external_1977_or_later">אקסטרנית (מ־1977)</option>
            <option value="other">אחר / לא בטוח/ה</option>
          </select>
        </label>
      </div>
      <label className="journey-pill journey-upload">
        <Upload size={17} aria-hidden="true" />
        העלאת גיליון PDF
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={!!reading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setError('');
            setReading('קוראים את גיליון הציונים…');
            try {
              const { readBagrutPdf } = await import('@/lib/bagrutPdf');
              const found = await readBagrutPdf(file, setReading);
              if (!found.length) {
                setError('לא זוהו שורות ציונים ברורות. אפשר להזין או לתקן את הציונים כאן.');
                return;
              }
              setRows(found.map((row) => ({ ...row, assessmentKind: 'exam' })));
              setImported(true);
              setReviewed(false);
              setComplete(false);
            } catch (cause) {
              setError(
                cause instanceof Error && /^(אפשר|בחרו)/.test(cause.message)
                  ? cause.message
                  : 'לא הצלחנו לקרוא את הקובץ. אפשר להזין את הציונים ידנית.',
              );
            } finally {
              setReading('');
            }
          }}
        />
      </label>
      {reading && <p role="status">{reading}</p>}
      {error && <p role="alert">{error}</p>}
      <table className="journey-grade-table">
        <thead>
          <tr>
            <th scope="col">מקצוע</th>
            <th scope="col">יחידות</th>
            <th scope="col">ציון</th>
            <th scope="col">
              <span className="sr-only">הסרה</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  list="journey-bagrut-subjects"
                  aria-label={`מקצוע ${index + 1}`}
                  value={row.label}
                  required={!isBlankRow(row)}
                  onChange={(event) => change(index, { label: event.target.value })}
                />
                {row.assessmentKind !== 'exam' && (
                  <small>
                    {row.assessmentKind === 'final_project' ? 'עבודת גמר' : 'ציון משולב'}
                  </small>
                )}
              </td>
              <td>
                <input
                  aria-label={`יחידות ${index + 1}`}
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  required={!isBlankRow(row)}
                  value={row.units}
                  onChange={(event) => change(index, { units: Number(event.target.value) })}
                />
              </td>
              <td>
                <input
                  aria-label={`ציון ${index + 1}`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required={!isBlankRow(row)}
                  value={row.grade}
                  onChange={(event) =>
                    change(index, {
                      grade: event.target.value === '' ? '' : Number(event.target.value),
                    })
                  }
                />
              </td>
              <td>
                <button
                  type="button"
                  className="journey-icon-button"
                  aria-label={`הסרת מקצוע ${index + 1}`}
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                >
                  <Trash2 size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="journey-bagrut-subjects">
        {labels.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <button
        className="journey-text-button"
        type="button"
        onClick={() =>
          setRows([...rows, { label: '', units: 5, grade: '', assessmentKind: 'exam' }])
        }
      >
        <Plus size={16} className="inline" /> הוספת מקצוע
      </button>
      <details className="journey-field-group">
        <summary>
          עבודת גמר או ציון משולב
          <ArrowLeft size={16} />
        </summary>
        {rows.map((row, index) => (
          <label className="journey-complete" key={index}>
            {row.label || `מקצוע ${index + 1}`}
            <select
              value={row.assessmentKind ?? 'exam'}
              onChange={(event) =>
                change(index, {
                  assessmentKind: event.target.value as BagrutWizardSubjectInput['assessmentKind'],
                })
              }
            >
              <option value="exam">בחינה</option>
              <option value="final_project">עבודת גמר</option>
              <option value="combined">משולב</option>
            </select>
          </label>
        ))}
      </details>
      <label className="journey-complete">
        <input
          type="checkbox"
          checked={complete}
          onChange={(event) => setComplete(event.target.checked)}
        />
        הזנתי את כל המקצועות שמופיעים בתעודה
      </label>
      {imported && (
        <label className="journey-complete">
          <input
            type="checkbox"
            required
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
          />
          בדקתי את הציונים שזוהו מול התעודה ותיקנתי או השלמתי את הנדרש
        </label>
      )}
      <div className="journey-actions">
        <button className="journey-primary" disabled={!!reading}>
          המשך
          <ArrowLeft size={18} />
        </button>
      </div>
    </form>
  );
}
