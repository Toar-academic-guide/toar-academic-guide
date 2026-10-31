import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import { ENGINEERING_MATH_PROGRAM_IDS } from '@/data/admissions/engineeringMathRequirements';
import { bagrutExamSubjects, overallBagrutAverage } from '@/lib/bagrutSubjectRecord';
import { HAIFA_ADMISSION_YEAR } from '@/lib/haifaAdmissionsInputs';
import { calculateBguBagrutAverage, calculateTauBagrutAverage } from './bagrutPolicies';

/** Derivations are local to evaluation; callers' scores and exam history stay intact. */
export function normalizeEvaluationInputs(input: AdmissionsEvaluationInput) {
  const extraInputs: AdmissionsExtraInputs = { ...input.extraInputs };
  const record = extraInputs.bagrutSubjectRecord;
  if (record && ENGINEERING_MATH_PROGRAM_IDS.has(input.degreeId)) {
    const mathematics = bagrutExamSubjects(record).find(
      (subject) => subject.subjectId === 'mathematics',
    );
    if (mathematics) {
      extraInputs.mathUnits ??= mathematics.units;
      extraInputs.mathGrade ??= mathematics.grade;
    }
  }
  const bagrut = input.bagrut ?? overallBagrutAverage(record);
  const reasons: Record<string, string[]> = {};
  const proxyInstitutions = new Set<string>();
  const overallReason =
    (input.bagrut === undefined || input.bagrutAverageEstimated) && bagrut !== undefined
      ? 'הממוצע הכללי הוא אומדן משוקלל לפי ציונים ויחידות, ללא בונוסים מוסדיים.'
      : undefined;

  for (const [institution, key, calculator] of [
    ['bgu', 'bguBagrutAverage', calculateBguBagrutAverage],
    ['tau', 'tauBagrutAverage', calculateTauBagrutAverage],
    ['colman', 'colmanBagrutAverage', undefined],
  ] as const) {
    if (extraInputs[key] !== undefined) continue;
    if (record) {
      const result = calculator?.(record);
      if (result?.state === 'calculated') extraInputs[key] = result.average;
    } else if (bagrut !== undefined) {
      extraInputs[key] = bagrut;
      proxyInstitutions.add(institution);
      if (institution === 'bgu') extraInputs.bguBagrutAverageEstimated = true;
      reasons[institution] = [
        `הממוצע הכללי ${bagrut} משמש אומדן לממוצע המוסדי; לא חושב ממקצועות הבגרות.`,
      ];
    }
  }
  for (const key of ['haifaBagrutYear', 'haifaPsychometricYear'] as const) {
    if (extraInputs[key] === undefined) {
      extraInputs[key] = HAIFA_ADMISSION_YEAR;
      (reasons.haifa ??= []).push(
        `${key === 'haifaBagrutYear' ? 'שנת הבגרות' : 'שנת הפסיכומטרי'} לא נמסרה; החישוב מניח את מחזור ${HAIFA_ADMISSION_YEAR}.`,
      );
    }
  }
  return { input: { ...input, bagrut, extraInputs }, reasons, overallReason, proxyInstitutions };
}
