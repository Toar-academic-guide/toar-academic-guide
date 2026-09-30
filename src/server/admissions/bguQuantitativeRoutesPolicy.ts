import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';

export interface BguQuantitativeProgramme {
  family: 'biology' | 'economics' | 'business' | 'accounting';
  department: number;
  path: number;
  specialization: number | null;
  score: number;
  minimumPsychometric: number;
  alternate?: { score: number; psychometric: number };
  directAverage?: number;
  directPreparatoryAverage?: number;
  officialProgramId: string;
  sourceUrl: string;
}

const sourceUrl = (query: string) =>
  `https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&${query}`;

export const BGU_QUANTITATIVE_PROGRAMMES: Record<string, BguQuantitativeProgramme> = {
  biology: {
    family: 'biology',
    department: 205,
    path: 15,
    specialization: null,
    score: 585,
    minimumPsychometric: 585,
    directAverage: 106,
    directPreparatoryAverage: 88,
    officialProgramId: 'dep205-pat15',
    sourceUrl: sourceUrl('p_dep1=205&p_pat1=15'),
  },
  economics: {
    family: 'economics',
    department: 142,
    path: 3,
    specialization: null,
    score: 620,
    minimumPsychometric: 600,
    alternate: { score: 640, psychometric: 570 },
    directAverage: 107,
    directPreparatoryAverage: 87,
    officialProgramId: 'dep142-pat3',
    sourceUrl: sourceUrl('p_dep1=142&p_pat1=3'),
  },
  business: {
    family: 'business',
    department: 142,
    path: 1,
    specialization: 1,
    score: 620,
    minimumPsychometric: 600,
    alternate: { score: 640, psychometric: 570 },
    directAverage: 107,
    directPreparatoryAverage: 87,
    officialProgramId: 'dep142-pat1-spe1',
    sourceUrl: sourceUrl('p_dep1=142&p_pat1=1&p_spe1=1'),
  },
  accounting: {
    family: 'accounting',
    department: 142,
    path: 1,
    specialization: 6,
    score: 620,
    minimumPsychometric: 620,
    alternate: { score: 660, psychometric: 580 },
    officialProgramId: 'dep142-pat1-spe6',
    sourceUrl: sourceUrl('p_dep1=142&p_pat1=1&p_spe1=6'),
  },
};

export function bguQuantitativeProgramme(programId: string) {
  return BGU_QUANTITATIVE_PROGRAMMES[programId.replace(/^bgu_/, '')];
}

type Conditions = { priorAcademicReview: boolean; mathematicsCourseRequired: boolean };
export type BguQuantitativeResolution =
  | { kind: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { kind: 'below'; reason: string }
  | ({
      kind: 'direct';
      route: 'bagrut' | 'preparatory' | 'psychometric';
      score: number;
      threshold: number;
    } & Conditions)
  | ({ kind: 'quantitative'; fields: URLSearchParams; threshold: number } & Conditions);

export function resolveBguQuantitativeRoute(
  programId: string,
  applicant: {
    psychometric?: number;
    extraInputs?: AdmissionsExtraInputs;
  },
): BguQuantitativeResolution {
  const config = bguQuantitativeProgramme(programId);
  if (!config) return { kind: 'below', reason: 'המסלול אינו אפיק כמותי שנבדק.' };
  const extra = applicant.extraInputs ?? {};
  const requiredInputs: AdmissionsRequiredInput[] = [];
  if (extra.bguLanguageRequirementsConfirmed === undefined)
    requiredInputs.push('bgu_language_requirements');
  if (extra.bguCertificateRequirementsConfirmed === undefined)
    requiredInputs.push('bgu_certificate_requirements');
  if (extra.bguPriorAcademicStudies === undefined)
    requiredInputs.push('bgu_prior_academic_studies');
  if (extra.bguSecondTrackRequirementsConfirmed === undefined)
    requiredInputs.push('bgu_second_track_requirements');
  if (config.family === 'biology' && extra.bguApplicationPriority === undefined)
    requiredInputs.push('bgu_application_priority');
  if (requiredInputs.length) return { kind: 'needs_input', requiredInputs };
  if (
    !extra.bguLanguageRequirementsConfirmed ||
    !extra.bguCertificateRequirementsConfirmed ||
    !extra.bguSecondTrackRequirementsConfirmed
  ) {
    return {
      kind: 'below',
      reason: 'נדרשת תעודת קבלה מוכרת, דרישות השפה ועמידה בדרישות חוג או חטיבה נוספים, אם נבחרו.',
    };
  }
  if (config.family === 'biology' && ![1, 2, 3].includes(extra.bguApplicationPriority!)) {
    return { kind: 'below', reason: 'מדעי החיים נבדקים בעדיפות ראשונה, שנייה או שלישית בלבד.' };
  }
  if (
    config.family !== 'biology' &&
    extra.bguPriorAcademicStudies &&
    extra.bguReturningOrChangingTrack === undefined
  ) {
    return { kind: 'needs_input', requiredInputs: ['bgu_returning_or_changing_track'] };
  }
  const conditions: Conditions = {
    priorAcademicReview:
      config.family === 'biology'
        ? extra.bguPriorAcademicStudies === true
        : extra.bguReturningOrChangingTrack === true,
    mathematicsCourseRequired: false,
  };
  const route = extra.bguQuantitativeRoute ?? 'auto';
  const p = applicant.psychometric;
  const q = extra.psychometricMath;
  const math = bagrutExamSubjects(extra.bagrutSubjectRecord).find(
    (subject) => subject.subjectId === 'mathematics',
  );
  const validMath =
    math &&
    [4, 5].includes(math.units) &&
    Number.isInteger(math.grade) &&
    math.grade >= 0 &&
    math.grade <= 100;
  const average = extra.bguBagrutAverage;
  const validAverage =
    typeof average === 'number' && Number.isFinite(average) && average >= 50 && average <= 130;
  const prepAverage = extra.bguPreparatoryAverage;
  const hasPrepDetails =
    prepAverage !== undefined ||
    extra.bguPreparatoryTrack !== undefined ||
    extra.bguPreparatoryCompleted === true;
  const validPrep =
    extra.bguPreparatoryCompleted === true &&
    ['precise_sciences_engineering', 'natural_life_sciences'].includes(
      extra.bguPreparatoryTrack ?? '',
    ) &&
    typeof prepAverage === 'number' &&
    Number.isFinite(prepAverage) &&
    prepAverage >= 0 &&
    prepAverage <= 100;
  const directMath =
    validMath &&
    ((math.units === 5
      ? math.grade >= (config.family === 'biology' ? 80 : 75)
      : math.grade >= (config.family === 'biology' ? 90 : 85)) ||
      (config.family === 'business' && q !== undefined && q >= 130 && math.grade >= 55));
  const directConditions = {
    ...conditions,
    mathematicsCourseRequired:
      config.family === 'business' &&
      !!validMath &&
      (math.units === 5 ? math.grade < 75 : math.grade < 85),
  };
  if (route === 'bagrut' || route === 'auto') {
    if (config.directAverage !== undefined && directMath) {
      if (validAverage && average >= config.directAverage)
        return {
          kind: 'direct',
          route: 'bagrut',
          score: average,
          threshold: config.directAverage,
          ...directConditions,
        };
      if (
        validPrep &&
        config.directPreparatoryAverage !== undefined &&
        prepAverage! >= config.directPreparatoryAverage
      ) {
        return {
          kind: 'direct',
          route: 'preparatory',
          score: prepAverage!,
          threshold: config.directPreparatoryAverage,
          ...directConditions,
        };
      }
    }
    if (route === 'bagrut' || p === undefined) {
      if (config.directAverage === undefined)
        return { kind: 'below', reason: 'בחשבונאות אין אפיק בגרות ללא פסיכומטרי במקור הנוכחי.' };
      if (
        hasPrepDetails &&
        !validAverage &&
        (!extra.bguPreparatoryTrack ||
          extra.bguPreparatoryCompleted === undefined ||
          prepAverage === undefined)
      )
        return { kind: 'needs_input', requiredInputs: ['bgu_preparatory_qualification'] };
      if (!validMath) return { kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] };
      if (!validAverage && !validPrep)
        return {
          kind: 'needs_input',
          requiredInputs: ['bgu_bagrut_average', 'bgu_preparatory_qualification'],
        };
      return {
        kind: 'below',
        reason: `אפיק הבגרות דורש ממוצע רשמי ${config.directAverage} ומתמטיקה ${config.family === 'biology' ? '4/90 או 5/80' : '4/85 או 5/75'}; מכינת בן־גוריון מוכרת יכולה להחליף רק את הממוצע.`,
      };
    }
  }
  const validP = typeof p === 'number' && Number.isInteger(p) && p >= 200 && p <= 800;
  const validQ = typeof q === 'number' && Number.isInteger(q) && q >= 50 && q <= 150;
  if (
    config.family === 'biology' &&
    (route === 'auto' || route === 'psychometric') &&
    validP &&
    validQ &&
    p >= 680 &&
    q >= 125
  ) {
    return { kind: 'direct', route: 'psychometric', score: p, threshold: 680, ...conditions };
  }
  if (route === 'psychometric') {
    if (config.family !== 'biology')
      return { kind: 'below', reason: 'אפיק פסיכומטרי ללא סכם כמותי אינו מפורסם למסלול זה.' };
    if (!validP || !validQ)
      return {
        kind: 'needs_input',
        requiredInputs: [
          ...(!validP ? ['psychometric_overall' as const] : []),
          ...(!validQ ? ['psychometric_math' as const] : []),
        ],
      };
    return { kind: 'below', reason: 'אפיק מדעי החיים ללא סכם דורש פסיכומטרי 680 ורכיב כמותי 125.' };
  }
  if (
    hasPrepDetails &&
    (!extra.bguPreparatoryTrack ||
      extra.bguPreparatoryCompleted === undefined ||
      prepAverage === undefined)
  )
    return { kind: 'needs_input', requiredInputs: ['bgu_preparatory_qualification'] };
  const missing: AdmissionsRequiredInput[] = [];
  if (!validP) missing.push('psychometric_overall');
  if (!validQ) missing.push('psychometric_math');
  if (!validAverage && !validPrep)
    missing.push('bgu_bagrut_average', 'bgu_preparatory_qualification');
  if (!validMath) missing.push('bagrut_subject_record');
  for (const [value, key] of [
    [extra.psychometricVerbal, 'psychometric_verbal'],
    [extra.psychometricEnglish, 'psychometric_english'],
  ] as const) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 50 || value > 150)
      missing.push(key);
  }
  if (missing.length) return { kind: 'needs_input', requiredInputs: missing };
  const mathPass =
    config.family === 'biology'
      ? math!.units === 5
        ? math!.grade >= 60
        : math!.grade >= 70
      : (math!.units === 5 ? math!.grade >= 65 : math!.grade >= 75) ||
        (q! >= 130 && math!.grade >= 55);
  if (!mathPass)
    return {
      kind: 'below',
      reason:
        config.family === 'biology'
          ? 'בסכם הכמותי למדעי החיים נדרשת מתמטיקה 4/70 או 5/60.'
          : 'נדרשת מתמטיקה 4/75 או 5/65; רכיב כמותי 130 מאפשר ציון עובר ב־4 או 5 יחידות.',
    };
  const threshold =
    p! >= config.minimumPsychometric
      ? config.score
      : config.alternate && p! >= config.alternate.psychometric
        ? config.alternate.score
        : undefined;
  if (threshold === undefined)
    return {
      kind: 'below',
      reason: `הפסיכומטרי אינו מגיע למינימום ${config.alternate?.psychometric ?? config.minimumPsychometric} באפיקי הסכם הכמותי.`,
    };
  const mathematicsCourseRequired =
    config.family !== 'biology' && (math!.units === 5 ? math!.grade < 75 : math!.grade < 85);
  return {
    kind: 'quantitative',
    threshold,
    priorAcademicReview: conditions.priorAcademicReview,
    mathematicsCourseRequired,
    fields: new URLSearchParams({
      on_grade_psycho_quantity: '',
      rn_count_other_subjects: '0',
      on_grade_other_quantity: String(q),
      on_grade_other_verbal: String(extra.psychometricVerbal),
      on_grade_other_psycho: String(extra.psychometricEnglish),
      on_grade_other_average: validAverage ? String(average) : '',
      on_grade_prep_average: validPrep ? String(prepAverage) : '',
    }),
  };
}
