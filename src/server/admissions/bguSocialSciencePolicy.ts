import { bguSocialScienceProgram } from '@/lib/bguSocialScienceInputs';
import { BGU_SOCIAL_SCIENCE_RULES } from '@/data/admissions/bguSocialScienceRules';
import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';

type Route = 'score' | 'psychometric' | 'bagrut' | 'preparatory' | 'age45';
export type BguSocialScienceAdmission =
  | { kind: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { kind: 'score'; psychometric: number; average: number }
  | { kind: 'manual_gate'; reason: string }
  | {
      kind: 'eligible' | 'below';
      route?: Route;
      score?: number;
      threshold?: number;
      reason: string;
    };

export function resolveBguSocialScienceAdmission(
  input: {
    degreeId: string;
    psychometric?: number;
    extraInputs?: AdmissionsExtraInputs;
  },
  calculatedScore?: number,
): BguSocialScienceAdmission {
  const programme = bguSocialScienceProgram(input.degreeId);
  if (!programme) throw new Error('Not a reviewed BGU social science programme');
  const rule = BGU_SOCIAL_SCIENCE_RULES[programme];
  const extra = input.extraInputs ?? {};
  const route = extra.bguSocialScienceRoute ?? 'auto';
  const missing: AdmissionsRequiredInput[] = [];
  const requireBoolean = (value: boolean | undefined, key: AdmissionsRequiredInput) => {
    if (value === undefined) missing.push(key);
    return value;
  };
  requireBoolean(extra.bguSocialScienceRequirementsConfirmed, 'bgu_social_science_requirements');
  requireBoolean(extra.bguReturningFromStudyBreak, 'bgu_returning_from_study_break');
  if (extra.bguSocialScienceRequirementsConfirmed === false)
    return {
      kind: 'below',
      reason: 'נדרשת תעודת קבלה מוכרת, תנאי החוג הנוסף ובעבודה סוציאלית גם עדיפות ההרשמה הנדרשת.',
    };
  if (route === 'education_conditional') {
    if (programme !== 'education')
      return {
        kind: 'below',
        reason:
          'האפיק המותנה באנגלית תקף לחינוך בלבד; ההקלה הישנה בפוליטיקה וממשל הסתיימה ביולי 2026.',
      };
    requireBoolean(extra.bguHebrewRequirementsConfirmed, 'bgu_hebrew_requirements');
    requireBoolean(extra.bguEnglishClassificationMissing, 'bgu_english_classification_missing');
    requireBoolean(
      extra.bguEducationEnglishConditionAcknowledged,
      'bgu_education_english_condition',
    );
    if (!extra.bguEducationSecondDepartment) missing.push('bgu_education_second_department');
    const english = extra.bagrutSubjectRecord?.subjects.find(
      (subject) => subject.subjectId === 'english',
    );
    const units = english?.units ?? extra.englishUnits;
    const grade = english?.grade ?? extra.englishGrade;
    if (units === undefined) missing.push('english_units');
    if (grade === undefined) missing.push('english_grade');
    if (
      extra.bguHebrewRequirementsConfirmed === false ||
      extra.bguEnglishClassificationMissing === false ||
      extra.bguEducationEnglishConditionAcknowledged === false ||
      extra.bguEducationSecondDepartment === 'other' ||
      (units !== undefined && units !== 5) ||
      (grade !== undefined && grade < 80)
    )
      return {
        kind: 'below',
        reason:
          'נדרשים אנגלית 5 יחידות בציון 80, היעדר סיווג באנגלית, עברית ה׳ או פטור וחוג שני מתוך פילוסופיה, לימודי מזרח תיכון, אמנות או לימודי מדינת ישראל. יש להגיע לרמת האנגלית הנדרשת עד סוף סמסטר א׳.',
      };
  } else {
    requireBoolean(extra.bguSocialScienceLanguageConfirmed, 'bgu_social_science_language');
    if (extra.bguSocialScienceLanguageConfirmed === false)
      return {
        kind: 'below',
        reason: `נדרשים אנגלית בסיסי ועברית ${programme === 'social_work' ? 'ו׳' : 'ה׳'} לנדרשים או פטור תקף.`,
      };
  }
  if (missing.length) return { kind: 'needs_input', requiredInputs: missing };
  if (extra.bguReturningFromStudyBreak)
    return {
      kind: 'manual_gate',
      reason: 'חזרה מהפסקת לימודים מחייבת דיון במחלקה; אי אפשר להסיק קבלה מהציונים בלבד.',
    };
  if (programme === 'social_work') {
    if (!extra.bguSocialWorkAcademicBackground)
      return { kind: 'needs_input', requiredInputs: ['bgu_social_work_academic_background'] };
    if (extra.bguSocialWorkAcademicBackground !== 'none') {
      if (extra.bguSocialWorkAcademicBackground === 'social_work') {
        if (extra.bguSocialWorkAcademicAverage === undefined)
          return { kind: 'needs_input', requiredInputs: ['bgu_social_work_academic_average'] };
        if (extra.bguSocialWorkAcademicAverage < 85)
          return {
            kind: 'below',
            reason:
              'לרקע אקדמי קודם בעבודה סוציאלית נדרש ממוצע 85 ומעלה, בנוסף לתנאי הקבלה ולדיון בוועדה.',
          };
      }
      if (extra.bguSocialWorkTranscriptProvided === undefined)
        return { kind: 'needs_input', requiredInputs: ['bgu_social_work_transcript'] };
      return {
        kind: 'manual_gate',
        reason:
          'מועמדים לעבודה סוציאלית עם רקע אקדמי קודם נדרשים להגיש גיליון ציונים מעודכן לדיון בוועדת הקבלה, גם בעמידה בחתכים. אין קבלה לשנה ב׳.',
      };
    }
  }

  const p = input.psychometric;
  const validP = p !== undefined && Number.isInteger(p) && p >= 200 && p <= 800;
  const average = extra.bguBagrutAverage;
  const validAverage =
    average !== undefined && Number.isFinite(average) && average >= 50 && average <= 130;
  const decision = (
    eligible: boolean,
    selectedRoute: Route,
    score: number,
    threshold: number,
    reason: string,
  ): BguSocialScienceAdmission => ({
    kind: eligible ? 'eligible' : 'below',
    route: selectedRoute,
    score,
    threshold,
    reason,
  });
  if (
    route === 'age45' ||
    (route === 'auto' &&
      rule.age45 &&
      extra.bguApplicantAge !== undefined &&
      extra.bguApplicantAge >= 45)
  ) {
    if (!rule.age45) return { kind: 'below', reason: 'אפיק גיל 45 ומעלה אינו מפורסם למסלול זה.' };
    if (extra.bguApplicantAge === undefined)
      return { kind: 'needs_input', requiredInputs: ['bgu_applicant_age'] };
    return decision(
      extra.bguApplicantAge >= 45,
      'age45',
      extra.bguApplicantAge,
      45,
      'אפיק גיל 45 ומעלה עם זכאות לבגרות ורמת אנגלית בסיסי, ללא פסיכומטרי.',
    );
  }
  if (route === 'auto' || route === 'psychometric') {
    if (validP && p >= rule.psychometricOnly)
      return decision(
        true,
        'psychometric',
        p,
        rule.psychometricOnly,
        `אפיק פסיכומטרי בלבד: ${rule.psychometricOnly} ומעלה.`,
      );
    if (route === 'psychometric')
      return validP
        ? decision(
            false,
            'psychometric',
            p,
            rule.psychometricOnly,
            `באפיק זה נדרש פסיכומטרי ${rule.psychometricOnly} ומעלה.`,
          )
        : { kind: 'needs_input', requiredInputs: ['psychometric_overall'] };
  }
  if (route === 'auto' || route === 'bagrut' || route === 'education_conditional') {
    if (validAverage && average >= rule.bagrut)
      return decision(
        true,
        'bagrut',
        average,
        rule.bagrut,
        route === 'education_conditional'
          ? 'עמידה באפיק הבגרות המותנה בחינוך; יש להשיג רמת אנגלית בסיסי עד סוף סמסטר א׳, בכפוף לאישור המוסד.'
          : `ממוצע בגרות רשמי של בן־גוריון ${rule.bagrut} ומעלה.`,
      );
    // The September Education exception explicitly names Bagrut; do not infer a prep exception.
    if (route !== 'education_conditional' && extra.bguPreparatoryTrack) {
      requireBoolean(extra.bguPreparatoryCompleted, 'bgu_preparatory_completed');
      const prep = extra.bguPreparatoryAverage;
      if (prep === undefined) missing.push('bgu_preparatory_average');
      if (extra.bguPreparatoryCompleted === true && prep !== undefined && prep >= rule.preparatory)
        return decision(
          true,
          'preparatory',
          prep,
          rule.preparatory,
          `מכינת בן־גוריון מוכרת שהושלמה בממוצע ${rule.preparatory} ומעלה.`,
        );
      if (route === 'bagrut' && !validAverage && !missing.length)
        return decision(
          false,
          'preparatory',
          prep!,
          rule.preparatory,
          'נדרשת מכינה מוכרת שהושלמה ועמידה בממוצע הנדרש.',
        );
    }
    if (route === 'bagrut' || route === 'education_conditional') {
      if (missing.length) return { kind: 'needs_input', requiredInputs: missing };
      if (!validAverage)
        return {
          kind: 'needs_input',
          requiredInputs: [
            extra.bguPreparatoryAverage !== undefined || extra.bguPreparatoryCompleted !== undefined
              ? 'bgu_preparatory_track'
              : 'bgu_bagrut_average',
          ],
        };
      return decision(
        false,
        'bagrut',
        average,
        rule.bagrut,
        `באפיק זה נדרש ממוצע בגרות רשמי ${rule.bagrut} או אפיק מכינה מוכרת בהתאם לתנאים.`,
      );
    }
  }
  if (!validP) missing.push('psychometric_overall');
  if (!validAverage) missing.push('bgu_bagrut_average');
  if (validP && validAverage) {
    if (calculatedScore === undefined) return { kind: 'score', psychometric: p, average };
    const eligible =
      rule.operator === 'and'
        ? calculatedScore >= rule.score && p >= rule.psychometric
        : calculatedScore >= rule.score || p >= rule.psychometric;
    if (eligible || !missing.length)
      return decision(
        eligible,
        'score',
        calculatedScore,
        rule.score,
        `סכם ${rule.score} ${rule.operator === 'and' ? 'וגם' : 'או'} פסיכומטרי ${rule.psychometric}; הסכם שחושב ${calculatedScore}, הפסיכומטרי שהוזן ${p}.`,
      );
  }
  return { kind: 'needs_input', requiredInputs: [...new Set(missing)] };
}
