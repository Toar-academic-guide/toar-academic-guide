import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

type Route = 'score' | 'psychometric' | 'bagrut' | 'preparatory';
type Result =
  | { kind: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { kind: 'score'; psychometric: number; average: number }
  | {
      kind: 'eligible' | 'below';
      route?: Route;
      score?: number;
      threshold?: number;
      reason: string;
    };

/** Main-campus ordinary routes; discretionary admission is never inferred. */
export function resolveBguPsychologyAdmission(
  input: AdmissionsEvaluationInput,
  score?: number,
): Result {
  const extra = input.extraInputs ?? {};
  const missing: AdmissionsRequiredInput[] = [];
  if (extra.bguLanguageRequirementsConfirmed === undefined)
    missing.push('bgu_language_requirements');
  if (extra.bguPsychologyRequirementsConfirmed === undefined)
    missing.push('bgu_psychology_requirements');
  if (
    extra.bguLanguageRequirementsConfirmed === false ||
    extra.bguPsychologyRequirementsConfirmed === false
  )
    return {
      kind: 'below',
      reason:
        'נדרשים אנגלית בסיסי, עברית ה׳ או פטור תקף, תעודת קבלה מוכרת ועמידה בתנאי החוג הנוסף.',
    };
  if (missing.length) return { kind: 'needs_input', requiredInputs: missing };

  const route = extra.bguPsychologyRoute ?? 'auto';
  const p = input.psychometric;
  const average = extra.bguBagrutAverage;
  const validP = p !== undefined && Number.isInteger(p) && p >= 200 && p <= 800;
  const validAverage =
    average !== undefined && Number.isFinite(average) && average >= 50 && average <= 130;
  if (route === 'auto' || route === 'psychometric') {
    if (validP && p >= 680)
      return {
        kind: 'eligible',
        route: 'psychometric',
        score: p,
        threshold: 680,
        reason: 'פסיכומטרי 680 ומעלה.',
      };
    if (!validP) missing.push('psychometric_overall');
    if (route === 'psychometric' && validP)
      return {
        kind: 'below',
        route: 'psychometric',
        score: p,
        threshold: 680,
        reason: 'באפיק פסיכומטרי בלבד נדרש ציון 680 ומעלה.',
      };
  }
  if (route === 'auto' || route === 'bagrut') {
    if (validAverage && average >= 113)
      return {
        kind: 'eligible',
        route: 'bagrut',
        score: average,
        threshold: 113,
        reason: 'ממוצע בגרות רשמי 113 ומעלה.',
      };
    if (
      extra.bguPreparatoryTrack !== undefined &&
      ['precise_sciences_engineering', 'natural_life_sciences'].includes(extra.bguPreparatoryTrack)
    ) {
      if (extra.bguPreparatoryCompleted === undefined) missing.push('bgu_preparatory_completed');
      const prep = extra.bguPreparatoryAverage;
      const validPrep = prep !== undefined && Number.isFinite(prep) && prep >= 0 && prep <= 100;
      if (!validPrep) missing.push('bgu_preparatory_average');
      if (validPrep && extra.bguPreparatoryCompleted === true && prep >= 94)
        return {
          kind: 'eligible',
          route: 'preparatory',
          score: prep,
          threshold: 94,
          reason: 'מכינת בן־גוריון מוכרת שהושלמה בממוצע 94 ומעלה.',
        };
      if (route === 'bagrut' && !missing.length && !validAverage)
        return {
          kind: 'below',
          route: 'preparatory',
          ...(validPrep ? { score: prep, threshold: 94 } : {}),
          reason: 'נדרשת מכינה מוכרת שהושלמה בממוצע 94 ומעלה.',
        };
    } else if (!validAverage)
      missing.push(
        extra.bguPreparatoryAverage !== undefined || extra.bguPreparatoryCompleted !== undefined
          ? 'bgu_preparatory_track'
          : 'bgu_bagrut_average',
      );
    if (route === 'bagrut' && !missing.length)
      return {
        kind: 'below',
        route: 'bagrut',
        score: average,
        threshold: 113,
        reason: 'נדרש ממוצע בגרות רשמי 113 או מכינה מוכרת שהושלמה בממוצע 94.',
      };
  }
  if (route === 'auto' || route === 'score') {
    if (!validP) missing.push('psychometric_overall');
    if (!validAverage) missing.push('bgu_bagrut_average');
    if (validP && validAverage) {
      if (score === undefined) return { kind: 'score', psychometric: p, average };
      if (Number.isFinite(score) && (score >= 680 || (score >= 650 && p >= 650)))
        return {
          kind: 'eligible',
          route: 'score',
          score,
          threshold: p >= 650 ? 650 : 680,
          reason: p >= 650 ? 'סכם 650 ופסיכומטרי 650 ומעלה.' : 'אפיק סכם 680 ומעלה.',
        };
      if (!missing.length)
        return {
          kind: 'below',
          route: 'score',
          score,
          threshold: p >= 650 ? 650 : 680,
          reason:
            'נדרשים סכם 650 וגם פסיכומטרי 650, או סכם 680. ניתן לבדוק בנפרד אפיק בגרות, מכינה או פסיכומטרי בלבד.',
        };
    }
  }
  return { kind: 'needs_input', requiredInputs: [...new Set(missing)] };
}
