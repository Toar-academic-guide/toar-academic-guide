import type {
  BagrutAssessmentKind,
  BagrutCertificateType,
  BagrutSector,
  BagrutSubjectRecordV2,
  BagrutSubjectV2,
} from '@/types';

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
  פיסיקה: 'physics',
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
  assessmentKind?: BagrutAssessmentKind;
}

export interface BuildBagrutSubjectRecordInput {
  certificateType?: BagrutCertificateType;
  complete?: boolean;
  sectorLabel: string;
  subjects: BagrutWizardSubjectInput[];
}

/**
 * Builds the client-side structured record used by server-owned profile
 * versioning. The weighted average remains an estimate; these exact rows are
 * what a future verified admissions policy replays.
 */
export function buildBagrutSubjectRecord({
  certificateType = 'other',
  complete = false,
  sectorLabel,
  subjects,
}: BuildBagrutSubjectRecordInput): BagrutSubjectRecordV2 {
  const sector = SECTOR_BY_WIZARD_LABEL[sectorLabel] ?? 'jewish';
  const validSubjects = subjects.filter(isValidSubject);
  const normalizedSubjects = validSubjects
    .map(({ label, units, grade, assessmentKind = 'exam' }) => ({
      subjectId: subjectIdForWizardLabel(label),
      units,
      grade,
      assessmentKind,
    }))
    .sort(
      (left, right) =>
        left.subjectId.localeCompare(right.subjectId) ||
        left.assessmentKind.localeCompare(right.assessmentKind),
    );
  const uniqueNormalizedSubjects = uniqueSubjects(normalizedSubjects);

  return {
    schemaVersion: 2,
    sector,
    certificateType,
    complete:
      complete &&
      validSubjects.length === subjects.length &&
      uniqueNormalizedSubjects.length === normalizedSubjects.length,
    subjects: uniqueNormalizedSubjects,
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

export function subjectIdForWizardLabel(label: string): string {
  const normalizedLabel = label.trim();
  return (
    SUBJECT_IDS_BY_WIZARD_LABEL[normalizedLabel] ??
    `subject_${Array.from(normalizedLabel, (character) => character.codePointAt(0)!.toString(16)).join('_')}`
  );
}

function uniqueSubjects(subjects: BagrutSubjectV2[]): BagrutSubjectV2[] {
  const seenEntries = new Set<string>();
  return subjects.filter((subject) => {
    const entryKey = `${subject.subjectId}:${subject.assessmentKind}`;
    if (seenEntries.has(entryKey)) {
      return false;
    }
    seenEntries.add(entryKey);
    return true;
  });
}
