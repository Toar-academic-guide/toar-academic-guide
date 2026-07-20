import type { BagrutSector, BagrutSubject, BagrutSubjectRecord } from '@/types';

const SECTOR_BY_WIZARD_LABEL: Record<string, BagrutSector> = {
  יהודי: 'jewish',
  ערבי: 'arab',
  דרוזי: 'druze',
  צרקסי: 'circassian',
  בדואי: 'bedouin',
  שומרוני: 'samaritan',
};

const SUBJECT_IDS_BY_WIZARD_LABEL: Record<string, string> = {
  אזרחות: 'civics',
  אנגלית: 'english',
  ביולוגיה: 'biology',
  כימיה: 'chemistry',
  מדעי_המחשב: 'computer_science',
  'מדעי המחשב': 'computer_science',
  מתמטיקה: 'mathematics',
  פיזיקה: 'physics',
  ספרות: 'literature',
  'תנ״ך': 'bible',
  'תנ"ך': 'bible',
  היסטוריה: 'history',
  'היסטוריה / תע״י': 'history',
  'הסטוריה ותע"י': 'history',
  'היסטוריה ותולדות הערבים': 'history',
  ערבית: 'arabic',
  עברית: 'hebrew',
  'הבעה עברית': 'hebrew_expression',
  'הבעה ערבית': 'arabic_expression',
};

export interface BagrutWizardSubjectInput {
  label: string;
  units: number;
  grade: number | '';
}

export interface BuildBagrutSubjectRecordInput {
  sectorLabel: string;
  subjects: BagrutWizardSubjectInput[];
}

/**
 * Builds the client-side structured record used by server-owned profile
 * versioning. The weighted average remains an estimate; these exact rows are
 * what a future verified admissions policy replays.
 */
export function buildBagrutSubjectRecord({
  sectorLabel,
  subjects,
}: BuildBagrutSubjectRecordInput): BagrutSubjectRecord {
  const sector = SECTOR_BY_WIZARD_LABEL[sectorLabel] ?? 'jewish';
  const normalizedSubjects = subjects
    .filter(isValidSubject)
    .map(({ label, units, grade }) => ({
      subjectId: subjectIdForWizardLabel(label),
      units,
      grade,
    }))
    .sort((left, right) => left.subjectId.localeCompare(right.subjectId));

  return {
    schemaVersion: 1,
    sector,
    subjects: uniqueSubjects(normalizedSubjects),
  };
}

function isValidSubject(subject: BagrutWizardSubjectInput): subject is BagrutWizardSubjectInput & {
  grade: number;
} {
  return (
    subject.label.trim().length > 0 &&
    Number.isInteger(subject.units) &&
    subject.units >= 1 &&
    subject.units <= 5 &&
    typeof subject.grade === 'number' &&
    Number.isInteger(subject.grade) &&
    subject.grade >= 0 &&
    subject.grade <= 100
  );
}

function subjectIdForWizardLabel(label: string): string {
  const normalizedLabel = label.trim();
  return (
    SUBJECT_IDS_BY_WIZARD_LABEL[normalizedLabel] ??
    `subject_${encodeURIComponent(normalizedLabel)
      .replace(/%/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase()}`
  );
}

function uniqueSubjects(subjects: BagrutSubject[]): BagrutSubject[] {
  const seenSubjectIds = new Set<string>();
  return subjects.filter((subject) => {
    if (seenSubjectIds.has(subject.subjectId)) {
      return false;
    }
    seenSubjectIds.add(subject.subjectId);
    return true;
  });
}
