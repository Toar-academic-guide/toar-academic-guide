import type { AcademicScores, BagrutSubjectRecord } from '@/types';
import type { CalculatorProfile } from './sekhemCalculator';
import { MAX_BAGRUT_SUBJECTS } from './bagrutSubjectLimits';
import {
  bagrutSubjectLabelForId,
  buildBagrutSubjectRecord,
  sectorLabelForRecord,
} from '@/utils/bagrutSubjectRecord';

export function calculatorProfile(scores?: AcademicScores): CalculatorProfile {
  const record = scores?.bagrut?.subjectRecord;
  const psy = scores?.psychometric;
  return {
    rows:
      record?.subjects.map((subject) => ({
        label: bagrutSubjectLabelForId(subject.subjectId) ?? subject.subjectId,
        units: subject.units,
        grade: subject.grade,
        assessmentKind: 'assessmentKind' in subject ? subject.assessmentKind : 'exam',
      })) ?? [],
    sector: record ? sectorLabelForRecord(record.sector) : 'יהודי',
    certificate: record?.schemaVersion === 2 ? record.certificateType : 'other',
    psychometric: String(psy?.overall ?? ''),
    verbal: String(psy?.verbal ?? ''),
    quantitative: String(psy?.quantitative ?? ''),
    english: String(psy?.english ?? ''),
  };
}

function filledRows(form: CalculatorProfile) {
  return form.rows.filter((row) => row.label.trim() || row.grade !== '');
}

function rowValues(form: CalculatorProfile) {
  return filledRows(form)
    .map((row) => JSON.stringify([row.label, row.units, row.grade, row.assessmentKind ?? 'exam']))
    .sort();
}

function bagrutChanged(form: CalculatorProfile, saved: CalculatorProfile) {
  return (
    form.sector !== saved.sector ||
    form.certificate !== saved.certificate ||
    JSON.stringify(rowValues(form)) !== JSON.stringify(rowValues(saved))
  );
}

const psychometricFields = ['psychometric', 'verbal', 'quantitative', 'english'] as const;

export function profileInputsChanged(form: CalculatorProfile, saved: CalculatorProfile) {
  return psychometricFields.some((key) => form[key] !== saved[key]) || bagrutChanged(form, saved);
}

export function editedAcademicScores(
  scores: AcademicScores,
  form: CalculatorProfile,
): AcademicScores {
  const saved = calculatorProfile(scores);
  const next = { ...scores };
  for (const field of psychometricFields) {
    if (form[field] === saved[field]) continue;
    const overall = field === 'psychometric';
    const key = overall ? 'overall' : field;
    const value = form[field] === '' ? undefined : Number(form[field]);
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < (overall ? 200 : 50) || value > (overall ? 800 : 150))
    )
      throw new Error('יש להזין ציון פסיכומטרי בטווח המתאים.');
    next.psychometric = { ...next.psychometric, [key]: value };
  }
  if (bagrutChanged(form, saved)) {
    const rows = filledRows(form);
    const previous = scores.bagrut?.subjectRecord;
    let record: BagrutSubjectRecord | undefined;
    if (!rows.length && !previous) throw new Error('הוסיפו מקצוע וציון כדי לשמור את פרטי הבגרות.');
    if (rows.length > MAX_BAGRUT_SUBJECTS)
      throw new Error(`אפשר לשמור עד ${MAX_BAGRUT_SUBJECTS} מקצועות בגרות.`);
    if (rows.length) {
      record = buildBagrutSubjectRecord({
        subjects: rows,
        sectorLabel: form.sector,
        certificateType: form.certificate,
        complete: previous?.schemaVersion === 2 ? previous.complete : true,
      });
      if (record.subjects.length !== rows.length)
        throw new Error('בדקו את שמות המקצועות, היחידות והציונים וודאו שאין כפילויות.');
    }
    next.bagrut = { ...scores.bagrut, subjectRecord: record };
    next.admissions = {
      ...scores.admissions,
      activeBagrutPath: record
        ? 'exact'
        : scores.bagrut?.weightedAverage !== undefined
          ? 'quick'
          : 'none',
    };
  }
  return next;
}

// Only the revision travels here. Scores stay in the existing profile.
export function savedAcademicRevision(identity: string) {
  try {
    return sessionStorage.getItem('myway:academic-revision:' + identity);
  } catch {
    return null;
  }
}
export function markAcademicSave(identity: string) {
  try {
    sessionStorage.setItem('myway:academic-revision:' + identity, crypto.randomUUID());
  } catch {
    /* Optional tab storage. */
  }
}
