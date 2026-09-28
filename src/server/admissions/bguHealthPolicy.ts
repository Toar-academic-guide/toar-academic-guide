import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

type Result =
  | { kind: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { kind: 'score'; psychometric: number; average: number }
  | {
      kind: 'eligible' | 'below';
      route?: 'score' | 'academic';
      score?: number;
      threshold?: number;
      reason: string;
    };

/** Eligibility for the published interview/department-review stage, never final admission. */
export function resolveBguHealthAdmission(
  input: AdmissionsEvaluationInput,
  score?: number,
): Result {
  const ot = input.degreeId === 'occupational_therapy';
  const extra = input.extraInputs ?? {};
  const confirmed = ot
    ? extra.bguOccupationalTherapyRequirementsConfirmed
    : extra.bguPhysiotherapyRequirementsConfirmed;
  if (confirmed === undefined)
    return {
      kind: 'needs_input',
      requiredInputs: [
        ot ? 'bgu_occupational_therapy_requirements' : 'bgu_physiotherapy_requirements',
      ],
    };
  if (!confirmed)
    return {
      kind: 'below',
      reason: ot
        ? 'נדרשים תעודת קבלה מוכרת, אנגלית מתקדמים א׳, עברית ו׳ לנדרשים או פטור תקף, עדיפות ראשונה או שנייה אחרי רפואה/פיזיותרפיה ורישום והגשת מסמכים עד 25.05.2026.'
        : 'נדרשים תעודת קבלה מוכרת, אנגלית מתקדמים ב׳, עברית ו׳ לנדרשים או פטור תקף, עדיפות ראשונה, פסיכומטרי עד אפריל או נתיב עד סתיו ורישום והגשת מסמכים עד 25.05.2026.',
    };
  const missing: AdmissionsRequiredInput[] = [];
  if (ot && extra.bguOccupationalTherapyRoute === 'academic') {
    if (extra.bguBachelorsDegreeCompleted === undefined)
      missing.push('bgu_bachelors_degree_completed');
    const average = extra.bguBachelorsDegreeAverage;
    if (average === undefined || !Number.isFinite(average) || average < 0 || average > 100)
      missing.push('bgu_bachelors_degree_average');
    if (extra.bguBachelorsDegreeCompleted === false)
      return {
        kind: 'below',
        route: 'academic',
        reason: 'אפיק הדיון ללא פסיכומטרי דורש תואר ראשון שהושלם בממוצע 85 ומעלה.',
      };
    if (missing.length) return { kind: 'needs_input', requiredInputs: missing };
    return {
      kind: average! >= 85 ? 'eligible' : 'below',
      route: 'academic',
      score: average,
      threshold: 85,
      reason:
        average! >= 85
          ? 'תואר ראשון שהושלם בממוצע 85 ומעלה מאפשר העברה לדיון במחלקה ללא פסיכומטרי. אין הבטחת ראיון או קבלה.'
          : 'אפיק הדיון במחלקה ללא פסיכומטרי דורש ממוצע תואר ראשון 85 ומעלה.',
    };
  }
  if (ot && extra.bguOccupationalTherapyExamSession === undefined)
    missing.push('bgu_occupational_therapy_exam_session');
  const p = input.psychometric;
  const average = extra.bguBagrutAverage;
  if (p === undefined || !Number.isInteger(p) || p < 200 || p > 800)
    missing.push('psychometric_overall');
  if (average === undefined || !Number.isFinite(average) || average < 50 || average > 130)
    missing.push('bgu_bagrut_average');
  if (missing.length) return { kind: 'needs_input', requiredInputs: missing };
  if (score === undefined) return { kind: 'score', psychometric: p!, average: average! };
  const threshold = ot ? 620 : 667;
  const minimumP = ot ? 600 : 667;
  const eligible = Number.isFinite(score) && score >= threshold && p! >= minimumP;
  return {
    kind: eligible ? 'eligible' : 'below',
    route: 'score',
    score,
    threshold,
    reason: !eligible
      ? `נדרשים גם סכם ${threshold} וגם פסיכומטרי ${minimumP}.`
      : ot
        ? `מתקיימים סכם 620 ופסיכומטרי 600. אלה תנאים לשלב הראיון בלבד.${extra.bguOccupationalTherapyExamSession === 'regular' ? '' : ' מועד יולי בפסיכומטרי או אביב בנתיב מאפשר זימון על בסיס מקום פנוי בלבד.'} נדרשים הצהרת בריאות ואישור מרופא משפחה לראיון. אין הבטחת קבלה.`
        : 'מתקיימים סכם 667 ופסיכומטרי 667. הזימון לראיון תלוי בדירוג הסכם והפסיכומטרי לאחר תוצאות אפריל; עמידה במינימום אינה מבטיחה זימון או קבלה.',
  };
}
