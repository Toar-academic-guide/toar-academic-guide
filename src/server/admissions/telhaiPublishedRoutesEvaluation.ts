import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import {
  allOf,
  anyOf,
  evaluatePublishedNumericRoutes,
  examSubject,
  mathAlternatives,
  minimum,
  type NumericGate,
} from './publishedNumericRoutes';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

function scienceGate(input: AdmissionsEvaluationInput): NumericGate {
  const subjects = bagrutExamSubjects(input.extraInputs?.bagrutSubjectRecord).filter((subject) =>
    ['biology', 'chemistry', 'physics'].includes(subject.subjectId),
  );
  const physics = examSubject(input, 'physics');
  if (
    !subjects.some((subject) => subject.subjectId === 'physics') &&
    physics.units !== undefined &&
    physics.grade !== undefined
  )
    subjects.push({ subjectId: 'physics', units: physics.units, grade: physics.grade });
  if (!subjects.length) return { below: false, missing: ['bagrut_subject_record'] };
  return {
    below: !subjects.some(
      (subject) =>
        (subject.units === 3 && subject.grade >= 85) ||
        (subject.units === 4 && subject.grade >= 75) ||
        (subject.units === 5 && subject.grade >= 65),
    ),
    missing: [],
  };
}

export function evaluateTelhaiPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}) {
  const biology = input.degreeId === 'telhai_biology';
  const math = mathAlternatives(
    input,
    biology
      ? [
          [4, 75],
          [5, 65],
        ]
      : [
          [4, 85],
          [5, 75],
        ],
  );
  const units = examSubject(input, 'mathematics').units;
  // The official biology route explicitly allows three units with summer preparation.
  const biologyMath = anyOf(math, {
    below: units !== undefined && units !== 3,
    missing: units === undefined ? ['math_units'] : [],
  });
  const subjects = biology ? allOf(biologyMath, scienceGate(input)) : math;
  const requirements = biology
    ? 'מתמטיקה 4 יחידות בציון 75 או 5 יחידות בציון 65, ומקצוע מדעי 3 יחידות בציון 85, 4 בציון 75 או 5 בציון 65'
    : 'מתמטיקה 4 יחידות בציון 85 או 5 יחידות בציון 75';
  const prep =
    biology && units === 3
      ? [
          {
            id: 'math_units' as const,
            label: 'מעבר קורס הכנה במתמטיקה בקיץ',
            status: 'unconfirmed' as const,
          },
        ]
      : [];
  const fullThreshold = biology ? 570 : 610;
  return evaluatePublishedNumericRoutes({
    institution,
    routes: [
      {
        label: 'פסיכומטרי',
        score: input.psychometric,
        threshold: fullThreshold,
        requirements: `פסיכומטרי ${fullThreshold} לפחות; ${units === 3 && biology ? 'מתמטיקה 3 יחידות עם קורס הכנה, ומקצוע מדעי ברמה הנדרשת' : requirements}`,
        ...allOf(minimum(input.psychometric, fullThreshold, 'psychometric_overall'), subjects),
        conditions: prep,
      },
      ...(biology
        ? ([[520, subjects]] as const)
        : ([
            [585, mathAlternatives(input, [[4, 85]])],
            [570, mathAlternatives(input, [[5, 75]])],
          ] as const)
      ).map(([threshold, gate]) => ({
        label: 'פסיכומטרי — ועדת קבלה',
        score: input.psychometric,
        threshold,
        requirements: `פסיכומטרי ${threshold} לפחות והדרישות במתמטיקה${biology ? ' ובמקצוע מדעי' : ''}`,
        ...allOf(minimum(input.psychometric, threshold, 'psychometric_overall'), gate),
        conditions: [
          ...prep,
          {
            id: 'admissions_committee' as const,
            label: 'דיון בוועדת הקבלה',
            status: 'unconfirmed' as const,
          },
        ],
      })),
    ],
    officialUrls: [`https://www.telhai.ac.il/BSc_${biology ? 'מדעי_החי' : 'מדעי_המחשב'}`],
    caveat: biology
      ? 'אפשר לברר גם קבלה לפי ציון משולב שתל־חי מחשבת. למי שלא למדו מקצוע מדעי ייתכנו קורסי הכנה.'
      : '',
  });
}
