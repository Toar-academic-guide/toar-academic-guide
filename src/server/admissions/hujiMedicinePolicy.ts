import {
  HUJI_MEDICINE_REQUIRED_INPUTS,
  hujiMedicineInputsSchema,
  type HujiMedicineInputs,
} from '@/lib/hujiMedicineInputs';

import type { AdmissionsRequiredInput } from '@/types/admissionsEvaluation';

export const HUJI_MEDICINE_CALCULATOR_URL = 'https://www.huji.ac.il/documents/medicine_calc.htm';
export const HUJI_MEDICINE_REQUIREMENTS_URL = 'https://info.huji.ac.il/bachelor/Medicine';
export const HUJI_MEDICINE_POLICY = {
  cycle: '2026-2027',
  track: '601-4601',
  minimumPsychometric: 700,
  screeningCutoff: 25.186,
  minimumAssessment: 175,
  finalCutoff: 25.783,
  psychometricDeadline: '2026-04-30',
  registrationDeadline: '2026-05-12',
  minimumEnglish: 120,
  minimumHebrew: 105,
  cognitive: {
    bagrut: [3.963, -20.0621],
    psychometric: [0.032073, 0.3672],
    weights: [0.3, 0.7],
    scale: [1.2235, -4.4598],
  },
  preparatory: {
    huji2021Onwards: [3.9261, -15.9285],
    older: [3.6201, -12.1296],
    weights: [0.5, 0.5],
    scale: [1.2422, -4.7609],
    otherLastVerifiedYear: 2022,
  },
  final: { assessment: [0.029, 19.9393], weights: [0.6, 0.4] },
} as const;

type MedicineStage = 'screening' | 'assessment' | 'final';
export interface HujiMedicineResult {
  status: 'decided' | 'needs_input' | 'manual';
  stage: MedicineStage;
  decision?: 'below' | 'eligible_to_apply';
  score?: number;
  cognitiveScore?: number;
  threshold?: number;
  missing: AdmissionsRequiredInput[];
  reasons: string[];
}

// Match the official calculator's positive-score rounding, including ties.
function round3(value: number): number {
  return Math.floor((value + 0.0005) * 1000) / 1000;
}

export function hujiMedicineCognitiveScore(
  average: number,
  psychometric: number,
  route: 'bagrut' | 'huji2021Onwards' | 'older',
): number {
  const p = HUJI_MEDICINE_POLICY;
  const normalizedP = p.cognitive.psychometric[0] * psychometric + p.cognitive.psychometric[1];
  if (route === 'bagrut') {
    const normalizedB = p.cognitive.bagrut[0] * (average / 10) + p.cognitive.bagrut[1];
    return round3(
      p.cognitive.scale[0] *
        (p.cognitive.weights[0] * normalizedB + p.cognitive.weights[1] * normalizedP) +
        p.cognitive.scale[1],
    );
  }
  const coefficients = p.preparatory[route];
  const normalizedPrep = coefficients[0] * (average / 10) + coefficients[1];
  return round3(
    p.preparatory.scale[0] * (0.5 * normalizedPrep + 0.5 * normalizedP) + p.preparatory.scale[1],
  );
}

export function hujiMedicineFinalScore(cognitive: number, assessment: number): number {
  const p = HUJI_MEDICINE_POLICY.final;
  return round3(
    p.weights[0] * (p.assessment[0] * assessment + p.assessment[1]) + p.weights[1] * cognitive,
  );
}

export function resolveHujiMedicineAdmission(
  psychometric: number | undefined,
  input: HujiMedicineInputs = {},
): HujiMedicineResult {
  const p = HUJI_MEDICINE_POLICY;
  const result: HujiMedicineResult = {
    status: 'needs_input',
    stage: 'screening',
    missing: [],
    reasons: [],
  };
  const parsed = hujiMedicineInputsSchema.safeParse(input);
  if (
    !parsed.success ||
    (psychometric !== undefined &&
      (!Number.isInteger(psychometric) || psychometric < 200 || psychometric > 800))
  ) {
    return {
      ...result,
      status: 'manual',
      reasons: ['יש להזין נתונים בטווחים הרשמיים לפני חישוב הזכאות.'],
    };
  }
  const extra = parsed.data;
  const missing = (key: keyof HujiMedicineInputs) =>
    result.missing.push(HUJI_MEDICINE_REQUIRED_INPUTS[key]);
  const fail = (
    reason: string,
    stage: MedicineStage = result.stage,
    score = result.score,
    threshold = result.threshold,
  ): HujiMedicineResult => ({
    ...result,
    status: 'decided',
    stage,
    decision: 'below',
    score,
    threshold,
    missing: [],
    reasons: [reason],
  });
  if (psychometric === undefined) {
    return {
      ...result,
      missing: ['psychometric_overall'],
      reasons: ['נדרש ציון פסיכומטרי רב־תחומי של 700 לפחות.'],
    };
  }
  if (psychometric < p.minimumPsychometric)
    return fail('הפסיכומטרי נמוך מ־700.', 'screening', psychometric, p.minimumPsychometric);
  if (extra.hujiMedicineAffirmativeAction === 'eligible')
    return {
      ...result,
      status: 'manual',
      reasons: [
        'לראויים לקידום קיימת תוספת קוגניטיבית ודירוג נפרד; גובה התוספת וסף הדירוג אינם מפורסמים. נדרש אישור מדור הקבלה.',
      ],
    };
  if (extra.hujiMedicineAffirmativeAction === undefined) missing('hujiMedicineAffirmativeAction');
  const route = extra.hujiMedicineRoute ?? 'bagrut';
  if (route === 'bagrut') {
    if (extra.hujiBagrutAverage === undefined) missing('hujiBagrutAverage');
    else
      result.cognitiveScore = hujiMedicineCognitiveScore(
        extra.hujiBagrutAverage,
        psychometric,
        'bagrut',
      );
  } else if (route === 'official_cognitive') {
    if (extra.hujiMedicineCognitiveScore === undefined) missing('hujiMedicineCognitiveScore');
    else result.cognitiveScore = extra.hujiMedicineCognitiveScore;
  } else {
    if (extra.hujiMedicinePreparatoryAverage === undefined)
      missing('hujiMedicinePreparatoryAverage');
    if (extra.hujiMedicinePreparatoryYear === undefined) missing('hujiMedicinePreparatoryYear');
    if (extra.hujiMedicinePreparatoryEligible === undefined)
      missing('hujiMedicinePreparatoryEligible');
    if (extra.hujiMedicinePreparatoryEligible === false)
      return {
        ...result,
        status: 'manual',
        reasons: ['נדרש אישור למכינה שהושלמה ולמסלול הטבע המוכר לרפואה.'],
      };
    const year = extra.hujiMedicinePreparatoryYear;
    if (year !== undefined && year > 2026)
      return { ...result, status: 'manual', reasons: ['שנת מכינה עתידית אינה תקפה למחזור תשפ״ז.'] };
    if (
      route === 'other_preparatory' &&
      year !== undefined &&
      year > p.preparatory.otherLastVerifiedYear
    ) {
      return {
        ...result,
        status: 'manual',
        reasons: [
          'נוסחת מכינה אחרת לאחר תשפ״ב אינה מאומתת. יש לקבל ציון קוגניטיבי רשמי ממדור הקבלה ולהזינו באפיק הציון הרשמי.',
        ],
      };
    }
    if (extra.hujiMedicinePreparatoryAverage !== undefined && year !== undefined) {
      result.cognitiveScore = hujiMedicineCognitiveScore(
        extra.hujiMedicinePreparatoryAverage,
        psychometric,
        route === 'huji_preparatory' && year >= 2021 ? 'huji2021Onwards' : 'older',
      );
    }
  }
  result.score = result.cognitiveScore;
  result.threshold = p.screeningCutoff;
  if (
    extra.hujiMedicineAffirmativeAction === 'standard' &&
    result.cognitiveScore !== undefined &&
    result.cognitiveScore < p.screeningCutoff
  )
    return fail('הציון הקוגניטיבי נמוך מסף המעבר למיון האישיותי, 25.186.');
  if (extra.hujiMedicineResidencyEligible === false)
    return fail('נדרשת אזרחות ישראלית או תושבות קבע.');
  if (extra.hujiMedicineQualificationConfirmed === false)
    return fail('נדרשת זכאות לבגרות או תעודה חלופית מוכרת.');
  if (extra.hujiMedicineRegistrationConfirmed === false)
    return {
      ...result,
      status: 'manual',
      reasons: ['ההרשמה והשלמת המסמכים לתשפ״ז הסתיימו ב־12.05.2026; יש לפנות למדור הקבלה.'],
    };
  if (extra.hujiMedicinePsychometricDate === undefined) missing('hujiMedicinePsychometricDate');
  else if (extra.hujiMedicinePsychometricDate > p.psychometricDeadline)
    return fail('המועד האחרון התקף לתשפ״ז הוא פסיכומטרי אפריל 2026.');
  for (const key of [
    'hujiMedicineResidencyEligible',
    'hujiMedicineQualificationConfirmed',
    'hujiMedicineRegistrationConfirmed',
    'hujiMedicinePriorStudyStatus',
  ] as const) {
    if (extra[key] === undefined) missing(key);
  }
  if (extra.hujiMedicinePriorStudyStatus === 'review_needed')
    return {
      ...result,
      status: 'manual',
      reasons: [
        'לימודים קודמים ברפואה/רפואת שיניים או הפסקת לימודי מקצוע בריאות מחייבים מסמכים או החלטת ועדה.',
      ],
    };
  if (extra.hujiMedicineEnglishBasis === undefined) missing('hujiMedicineEnglishBasis');
  else if (extra.hujiMedicineEnglishBasis === 'score') {
    if (extra.hujiMedicineEnglishScore === undefined) missing('hujiMedicineEnglishScore');
    else if (extra.hujiMedicineEnglishScore < p.minimumEnglish)
      return fail('נדרשת אנגלית בציון 120 לפחות / רמת מתקדמים ב׳.');
  }
  if (extra.hujiMedicineHebrewBasis === undefined) missing('hujiMedicineHebrewBasis');
  else if (extra.hujiMedicineHebrewBasis === 'yael') {
    if (extra.hujiMedicineHebrewScore === undefined) missing('hujiMedicineHebrewScore');
    else if (extra.hujiMedicineHebrewScore < p.minimumHebrew)
      return fail('לנדרשים יש להציג עברית בציון 105 לפחות או רמה ה׳ מוכרת.');
  }
  if (extra.hujiMedicineAssessmentScore === undefined) missing('hujiMedicineAssessmentScore');
  else {
    if (extra.hujiMedicineAssessmentScore < p.minimumAssessment)
      return fail(
        'נדרש ציון מו״ר/מרק״ם 175 לפחות לפני הבחירה הסופית.',
        'assessment',
        extra.hujiMedicineAssessmentScore,
        p.minimumAssessment,
      );
    if (extra.hujiMedicineAssessmentYear === undefined) missing('hujiMedicineAssessmentYear');
    else if (extra.hujiMedicineAssessmentYear === 2023)
      return {
        ...result,
        status: 'manual',
        reasons: ['בעמוד הרשמי מופיעות תקופות תוקף שונות לציון משנת 2023; נדרש אישור מדור הקבלה.'],
      };
    else if (![2024, 2025, 2026].includes(extra.hujiMedicineAssessmentYear))
      return fail('ציוני המבדקים המאומתים לתשפ״ז הם מהשנים 2024–2026.', 'assessment');
    if (result.cognitiveScore !== undefined) {
      result.stage = 'final';
      result.score = hujiMedicineFinalScore(
        result.cognitiveScore,
        extra.hujiMedicineAssessmentScore,
      );
      result.threshold = p.finalCutoff;
      if (extra.hujiMedicineAffirmativeAction === 'standard' && result.score < p.finalCutoff)
        return fail('הציון הסופי נמוך מסף תשפ״ז הנוכחי, 25.783.');
    }
  }
  if (result.missing.length) return result;
  return {
    ...result,
    status: 'decided',
    stage: 'final',
    decision: 'eligible_to_apply',
    reasons: [
      'הנתונים עומדים בספים המפורסמים; החלטת הקבלה, דירוג המועמדים והאישור הסופי הם של האוניברסיטה. המלצת מתמטיקה 4/80 או 5/70 עשויה לחייב קורס בשנה א׳ ולא סף דחייה.',
    ],
  };
}
