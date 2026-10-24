import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

export type NumericGate = { below: boolean; missing: AdmissionsRequiredInput[] };
export type PublishedNumericRoute = NumericGate & {
  label: string;
  score?: number;
  threshold: number;
  requirements: string;
  conditions?: NonNullable<AdmissionsEvaluationResult['additionalConditions']>;
};

export function minimum(
  value: number | undefined,
  threshold: number,
  field: AdmissionsRequiredInput,
): NumericGate {
  return {
    below: value !== undefined && value < threshold,
    missing: value === undefined ? [field] : [],
  };
}

export function allOf(...gates: NumericGate[]): NumericGate {
  return {
    below: gates.some((gate) => gate.below),
    missing: [...new Set(gates.flatMap((gate) => gate.missing))],
  };
}

export function anyOf(...gates: NumericGate[]): NumericGate {
  const matched = gates.find((gate) => !gate.below && !gate.missing.length);
  if (matched) return matched;
  const possible = gates.filter((gate) => !gate.below);
  return {
    below: !possible.length,
    missing: [...new Set(possible.flatMap((gate) => gate.missing))],
  };
}

export function examSubject(
  input: AdmissionsEvaluationInput,
  subjectId: 'mathematics' | 'english' | 'physics' | 'computer_science',
) {
  const extra = input.extraInputs;
  const record = extra?.bagrutSubjectRecord;
  const subject = bagrutExamSubjects(record).find((row) => row.subjectId === subjectId);
  if (
    record?.subjects.some((row) => row.subjectId === subjectId) ||
    (record?.schemaVersion === 2 && record.complete)
  )
    return { units: subject?.units, grade: subject?.grade };
  if (subjectId === 'mathematics') return { units: extra?.mathUnits, grade: extra?.mathGrade };
  if (subjectId === 'english') return { units: extra?.englishUnits, grade: extra?.englishGrade };
  if (subjectId === 'computer_science') return { units: extra?.csUnits, grade: extra?.csGrade };
  return { units: extra?.physicsUnits, grade: extra?.physicsGrade };
}

export function mathAlternatives(
  input: AdmissionsEvaluationInput,
  alternatives: readonly (readonly [number, number])[],
): NumericGate {
  const { units, grade } = examSubject(input, 'mathematics');
  return anyOf(
    ...alternatives.map(([requiredUnits, requiredGrade]) =>
      allOf(
        {
          below: units !== undefined && units !== requiredUnits,
          missing: units === undefined ? ['math_units'] : [],
        },
        minimum(grade, requiredGrade, 'math_grade'),
      ),
    ),
  );
}

export function evaluatePublishedNumericRoutes({
  institution,
  routes,
  officialUrls,
  caveat = '',
  confidence = 'medium',
}: {
  institution: CatalogueInstitution;
  routes: PublishedNumericRoute[];
  officialUrls: string[];
  caveat?: string;
  confidence?: AdmissionsEvaluationResult['confidence'];
}): AdmissionsEvaluationResult {
  const base = {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'estimated' as const,
    kind: 'estimated' as const,
    confidence,
    sourceLabel: 'התאמה לפי הציונים',
    officialUrls,
  };
  const match = routes.find((route) => !route.below && !route.missing.length);
  if (match)
    return {
      ...base,
      decision: 'pending',
      score: match.score,
      threshold: match.threshold,
      scoreLabel: match.label,
      scoreAssessment: 'meets_threshold',
      additionalConditions: [
        {
          id: 'bagrut_average',
          label: 'אישור זכאות לבגרות ועמידה בדרישות השפה',
          status: 'unconfirmed',
        },
        ...(match.conditions ?? []),
      ],
      explanation: `הציונים שהוזנו עומדים בתנאי המסלול: ${match.requirements}. עמידה בסף אינה אישור קבלה.${caveat ? ` ${caveat}` : ''}`,
      nextAction: 'פנו לייעוץ והרשמה במוסד לאישור הנתונים והתנאים הנוספים.',
    };
  const possible = routes.filter((route) => !route.below);
  if (possible.length) {
    const route = possible.reduce((best, candidate) =>
      candidate.missing.length < best.missing.length ? candidate : best,
    );
    return {
      ...base,
      kind: 'needs_input',
      capability: 'needs_input',
      decision: 'unknown',
      requiredInputs: route.missing,
      explanation: `חסרים נתונים לבדיקת המסלול: ${route.requirements}.`,
      nextAction: 'השלימו את הציונים והמקצועות החסרים בפרופיל האקדמי.',
    };
  }
  return {
    ...base,
    decision: 'below',
    scoreAssessment: 'below_threshold',
    explanation: `לפי הנתונים שהוזנו, תנאי מסלולי הציונים שנבדקו אינם מתקיימים.${caveat ? ` ${caveat}` : ''}`,
    nextAction: 'אפשר לברר עם המוסד על מכינה או אפשרויות קבלה נוספות.',
  };
}
