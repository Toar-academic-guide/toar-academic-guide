import { admissionsExtraInputsFromAcademicScores } from './admissionsEvaluationProfile';
import {
  buildBagrutSubjectRecord,
  subjectIdForWizardLabel,
  type BagrutWizardSubjectInput,
} from '@/utils/bagrutSubjectRecord';
import { MAX_BAGRUT_SUBJECTS } from './bagrutSubjectLimits';
import type { BagrutCertificateType } from '@/types';
import type {
  AdmissionsBatchInput,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';

export interface CalculatorOffering {
  programId: string;
  programName: string;
  programPath?: string;
  sourceProgramIds?: string[];
  institutionId: string;
  institutionName: string;
}

export interface CalculatorProfile {
  rows: BagrutWizardSubjectInput[];
  sector: string;
  certificate: BagrutCertificateType;
  psychometric: string;
  verbal: string;
  quantitative: string;
  english: string;
}

export function buildSekhemInput(
  profile: CalculatorProfile,
): Omit<AdmissionsBatchInput, 'degreeIds'> {
  const rows = profile.rows;
  const validNumber = (value: number | '', min: number, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  if (
    !rows.length ||
    rows.length > MAX_BAGRUT_SUBJECTS ||
    rows.some(
      (row) =>
        !row.label.trim() || !validNumber(row.units, 1, 5) || !validNumber(row.grade, 0, 100),
    ) ||
    new Set(rows.map((row) => subjectIdForWizardLabel(row.label))).size !== rows.length
  ) {
    throw new Error('יש להשלים את המקצוע, היחידות והציון בכל שורה ולוודא שאין כפילויות.');
  }
  const parse = (value: string, min: number, max: number) => {
    const number = value.trim() ? Number(value) : NaN;
    if (!validNumber(number, min, max)) throw new Error('יש להזין ציון בטווח המתאים.');
    return number;
  };
  const record = buildBagrutSubjectRecord({
    sectorLabel: profile.sector,
    certificateType: profile.certificate,
    // PM rule: entering grades implies full bagrut; never add a confirmation gate.
    complete: true,
    subjects: rows,
  });
  const extraInputs = admissionsExtraInputsFromAcademicScores({
    bagrut: { subjectRecord: record },
    psychometric: {
      overall: parse(profile.psychometric, 200, 800),
      ...(profile.verbal ? { verbal: parse(profile.verbal, 50, 150) } : {}),
      ...(profile.quantitative ? { quantitative: parse(profile.quantitative, 50, 150) } : {}),
      ...(profile.english ? { english: parse(profile.english, 50, 150) } : {}),
    },
  })!;
  // The legacy paired HTTP fields have narrower ranges than raw subject rows.
  // Preserve every raw row, including failed grades, while omitting invalid projections.
  for (const [units, grade] of [
    ['mathUnits', 'mathGrade'],
    ['englishUnits', 'englishGrade'],
    ['physicsUnits', 'physicsGrade'],
    ['csUnits', 'csGrade'],
  ] as const) {
    if (
      !validNumber(extraInputs[units] ?? '', 3, 5) ||
      !validNumber(extraInputs[grade] ?? '', 50, 100)
    ) {
      delete extraInputs[units];
      delete extraInputs[grade];
    }
  }
  return { psychometric: parse(profile.psychometric, 200, 800), extraInputs };
}

export function resultVerdict(result: AdmissionsEvaluationResult): string {
  if (result.kind === 'needs_input') return 'חסרים נתונים לחישוב';
  if (result.decision === 'accepted' || result.scoreAssessment === 'meets_threshold')
    return 'הציונים עומדים בתנאי הקבלה';
  if (result.decision === 'below' || result.scoreAssessment === 'below_threshold')
    return 'הציונים מתחת לסף';
  if (result.kind === 'manual_gate') return 'שלבי קבלה נוספים';
  return 'חסרים נתונים לחישוב';
}
