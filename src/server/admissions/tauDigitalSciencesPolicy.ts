import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

export const TAU_DIGITAL_SCIENCES_PROGRAM_URL =
  'https://go.tau.ac.il/he/engineering/ba/high-tech-plus?v=admission-requirements';

export const TAU_DIGITAL_SCIENCES_POLICY = {
  admissionCycle: '2026-2027',
  officialProgramId: '056011050000',
  acceptanceCutoff: 652,
  rejectionCutoff: 632,
  minimumPsychometric: 620,
  minimumEnglish: 100,
  mathRoutes: [
    { units: 5, minimumGrade: 75 },
    { units: 4, minimumGrade: 85 },
  ],
  exactSciencesBonus: {
    points: 10,
    minimumUnits: 5,
    minimumGrade: 55,
    subjectIds: ['mathematics', 'physics'],
  },
} as const;

export type TauDigitalSciencesGateResult =
  | {
      state: 'needs_input';
      requiredInputs: AdmissionsRequiredInput[];
      exactSciencesBonusEligible: false;
    }
  | {
      state: 'below';
      unmetRequirements: string[];
      exactSciencesBonusEligible: boolean;
    }
  | {
      state: 'pass';
      exactSciencesBonusEligible: boolean;
    };

export function evaluateTauDigitalSciencesGates(
  input: AdmissionsEvaluationInput,
): TauDigitalSciencesGateResult {
  const extraInputs = input.extraInputs;
  const missingInputs: AdmissionsRequiredInput[] = [];
  if (extraInputs?.psychometricEnglish === undefined) {
    missingInputs.push('psychometric_english');
  }
  if (!extraInputs?.bagrutSubjectRecord) {
    missingInputs.push('bagrut_subject_record');
  }

  if (
    missingInputs.length > 0 ||
    extraInputs?.psychometricEnglish === undefined ||
    !extraInputs.bagrutSubjectRecord
  ) {
    return {
      state: 'needs_input',
      requiredInputs: missingInputs,
      exactSciencesBonusEligible: false,
    };
  }

  const record = extraInputs.bagrutSubjectRecord;
  const subjects = new Map(record.subjects.map((subject) => [subject.subjectId, subject]));
  const mathematics = subjects.get('mathematics');
  const physics = subjects.get('physics');
  const unmetRequirements: string[] = [];

  if (input.psychometric < TAU_DIGITAL_SCIENCES_POLICY.minimumPsychometric) {
    unmetRequirements.push(
      `ציון פסיכומטרי כללי ${TAU_DIGITAL_SCIENCES_POLICY.minimumPsychometric} ומעלה`,
    );
  }

  if (
    extraInputs.psychometricEnglish < TAU_DIGITAL_SCIENCES_POLICY.minimumEnglish
  ) {
    unmetRequirements.push(
      `רמת מתקדמים א׳ באנגלית (${TAU_DIGITAL_SCIENCES_POLICY.minimumEnglish} ומעלה)`,
    );
  }

  const passesMathRoute = TAU_DIGITAL_SCIENCES_POLICY.mathRoutes.some(
    (route) =>
      mathematics?.units === route.units && mathematics.grade >= route.minimumGrade,
  );
  if (!passesMathRoute) {
    unmetRequirements.push('מתמטיקה: 5 יח״ל בציון 75 ומעלה או 4 יח״ל בציון 85 ומעלה');
  }

  const exactSciencesBonusEligible =
    mathematics?.units === TAU_DIGITAL_SCIENCES_POLICY.exactSciencesBonus.minimumUnits &&
    mathematics.grade >= TAU_DIGITAL_SCIENCES_POLICY.exactSciencesBonus.minimumGrade &&
    physics?.units === TAU_DIGITAL_SCIENCES_POLICY.exactSciencesBonus.minimumUnits &&
    physics.grade >= TAU_DIGITAL_SCIENCES_POLICY.exactSciencesBonus.minimumGrade;

  return unmetRequirements.length > 0
    ? { state: 'below', unmetRequirements, exactSciencesBonusEligible }
    : { state: 'pass', exactSciencesBonusEligible };
}
