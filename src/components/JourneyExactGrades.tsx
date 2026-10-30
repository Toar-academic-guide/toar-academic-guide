'use client';

import { useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { SECTORS } from '@/data/bagrutSubjects';
import BagrutSubjectRows, {
  bagrutSubjectLabels,
  rowsForSector,
  subjectRowValues,
  type BagrutSubjectRow,
} from './BagrutSubjectRows';
import { defaultUnitsFor } from './bagrutUnitOptions';
import { buildBagrutSubjectRecord, subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import type { BagrutCertificateType, BagrutSector, BagrutSubjectRecord } from '@/types';

const SECTOR_LABELS: Record<BagrutSector, string> = {
  jewish: 'יהודי',
  arab: 'ערבי',
  druze: 'דרוזי',
  circassian: 'צרקסי',
  bedouin: 'בדואי',
  samaritan: 'שומרוני',
};
const labelById = new Map(
  bagrutSubjectLabels.map((label) => [subjectIdForWizardLabel(label), label]),
);
const starterRows = new Set(
  Object.entries(SECTORS).flatMap(([sector, items]) =>
    items.map((item) => `${item.n}|${defaultUnitsFor(item.n, sector)}`),
  ),
);
// A row the student never filled: an empty added row, or an untouched starter row.
const isBlankRow = (row: BagrutSubjectRow) =>
  row.grade === '' &&
  (row.assessmentKind ?? 'exam') === 'exam' &&
  (row.label.trim() === '' ||
    (row.autoUnits === true && starterRows.has(`${row.label}|${row.units}`)));
const emptyRows = (sector: string): BagrutSubjectRow[] =>
  SECTORS[sector].map((subject) => ({
    label: subject.n,
    units: defaultUnitsFor(subject.n, sector),
    autoUnits: true,
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
  const [rows, setRows] = useState<BagrutSubjectRow[]>(
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
          complete: true,
          subjects: subjectRowValues(filledRows),
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
                    row.autoUnits &&
                    row.units === defaults[index].units &&
                    row.grade === '' &&
                    row.assessmentKind === defaults[index].assessmentKind,
                );
              if (untouched) setRows(emptyRows(nextSector));
              else setRows(rowsForSector(rows, nextSector));
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
      <BagrutSubjectRows rows={rows} onChange={setRows} isBlankRow={isBlankRow} sector={sector} />
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
          המשיכו
          <ArrowLeft size={18} />
        </button>
      </div>
    </form>
  );
}
