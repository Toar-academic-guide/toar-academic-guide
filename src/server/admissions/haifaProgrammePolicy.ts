import evidence from '@/data/admissions/haifaProgrammePolicies.json';
import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

interface ProgrammePolicy {
  programme: string;
  aliases: string[];
  officialCalculatorId: string;
  officialCalculatorHug: string;
  source: { url: string; sha256: string };
  score: { acceptance: number; publishedWaitingMinimum: number };
  english: { minimumClassificationScore: number };
  hebrew: {
    minimumExamScore: number;
    unconditionalExamScore: number;
    facultyConditionalMinimum?: number;
  };
  mathAlternatives: { units: number; minimumGrade: number }[];
  manualStages: string[];
  mappingState?: string;
  minimumPsychometricOverall?: number;
  minimumScienceUnits?: number;
  latestHebrewExamSession?: string;
  registrationHeadline: string;
  deadlines?: {
    latestPsychometricSession?: string | null;
    registration?: string | null;
    documents?: string | null;
    sourceUrl: string;
  };
}
const policies: ProgrammePolicy[] = evidence.records;
export function getHaifaProgrammePolicy(programId: string) {
  return policies.find((policy) => policy.aliases.includes(programId));
}

type PolicyResult =
  | { kind: 'ready' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { kind: 'below'; reasons: string[] }
  | {
      kind: 'eligible' | 'pending';
      conditional: boolean;
      route: 'score' | 'ofek' | 'suitability';
      reason: string;
      steps: string[];
    };

const englishLevels = { pre_basic: 50, basic: 85, advanced_a: 100, advanced_b: 120, exempt: 134 };
const selectionSteps: Record<string, string[]> = {
  accounting: ['לפני תחילת הלימודים נדרש ציון 60 לפחות בקורס המידע החשבונאי של האוניברסיטה.'],
  nursing: ['נדרש מבחן התאמה ממוחשב של החוג; החלטת הקבלה נתונה לחוג.'],
  occupational_therapy: [
    'נדרש ריאיון בכתב, ולאחר מעברו ריאיון בעל־פה. עדיפות למועמדים בעדיפות ראשונה.',
  ],
  physiotherapy: ['נדרש ריאיון קבלה לפי החלטת החוג.'],
  social_work: [
    'נדרשים ריאיון קבלה והשלמת מסמכי החוג במערכת המועמדים; ללא המסמכים לא ניתן לדון בבקשה.',
  ],
  statistics: ['נדרש ריאיון קבלה בחוג.'],
};

/** Current standard score route. Selection and conditional stages never establish final admission. */
export function evaluateHaifaProgrammePolicy(args: {
  programId: string;
  input: AdmissionsEvaluationInput;
  score?: number;
  now: Date;
}): PolicyResult {
  const policy = getHaifaProgrammePolicy(args.programId);
  if (!policy || policy.mappingState === 'unresolved')
    return {
      kind: 'unavailable',
      reason: 'מיפוי מסלול מערכות המידע למחשבון הרשמי טרם אומת; לא ניתן לקבוע זכאות.',
    };
  const extra = args.input.extraInputs ?? {};
  const missing: AdmissionsRequiredInput[] = [];
  const reasons: string[] = [];
  const steps = [...(selectionSteps[policy.programme] ?? [])];
  let conditional = false;
  if (extra.haifaAdmissionQualification === undefined)
    missing.push('haifa_admission_qualification');
  else if (extra.haifaAdmissionQualification === 'none')
    reasons.push('נדרשת תעודת בגרות מלאה או תעודה מקבילה שהוכרה באוניברסיטה.');
  if (policy.mathAlternatives.length) {
    if (extra.mathUnits === undefined) missing.push('math_units');
    if (extra.mathGrade === undefined) missing.push('math_grade');
    if (
      extra.mathUnits !== undefined &&
      extra.mathGrade !== undefined &&
      !policy.mathAlternatives.some(
        (option) => option.units === extra.mathUnits && extra.mathGrade! >= option.minimumGrade,
      )
    )
      reasons.push(
        `דרישת המתמטיקה: ${policy.mathAlternatives.map((option) => `${option.units} יחידות בציון ${option.minimumGrade} לפחות`).join(' או ')}.`,
      );
  }
  const english =
    extra.haifaEnglishLevel === undefined
      ? extra.psychometricEnglish
      : englishLevels[extra.haifaEnglishLevel];
  if (english === undefined) missing.push('haifa_english_level');
  else if (english < policy.english.minimumClassificationScore)
    reasons.push(
      `נדרשת רמת אנגלית המקבילה לציון מיון ${policy.english.minimumClassificationScore} לפחות.`,
    );
  else if (english < 85) {
    conditional = true;
    steps.push('רמת האנגלית טרום־בסיסי: יש להשלים את חובות האנגלית בהתאם לכללי האוניברסיטה.');
  }

  if (extra.haifaHebrewQualification === undefined) missing.push('haifa_hebrew_qualification');
  else if (
    extra.haifaHebrewQualification === 'exam' ||
    extra.haifaHebrewQualification === 'university_exam'
  ) {
    if (extra.haifaHebrewScore === undefined) missing.push('haifa_hebrew_score');
    if (extra.haifaHebrewExamDate === undefined) missing.push('haifa_hebrew_exam_date');
    else {
      const today = args.now.toISOString().slice(0, 10);
      const tenYearsAgo = `${Number(today.slice(0, 4)) - 10}${today.slice(4)}`;
      if (extra.haifaHebrewExamDate > today)
        reasons.push('נדרש ציון מבחן עברית מבחינה שכבר התקיימה.');
      if (extra.haifaHebrewQualification === 'exam' && extra.haifaHebrewExamDate < tenYearsAgo)
        reasons.push('נדרש ציון יע״ל או יעלנט תקף מעשר השנים האחרונות.');
      if (
        policy.latestHebrewExamSession &&
        extra.haifaHebrewExamDate.slice(0, 7) > policy.latestHebrewExamSession
      )
        reasons.push(
          `בחוג זה מועד מבחן העברית האחרון המוכר לתשפ״ז הוא ${policy.latestHebrewExamSession}.`,
        );
    }
    if (extra.haifaHebrewScore !== undefined) {
      const minimum = policy.hebrew.facultyConditionalMinimum ?? policy.hebrew.minimumExamScore;
      if (extra.haifaHebrewScore < minimum)
        reasons.push(`דרישת העברית במסלול זה: ציון ${minimum} לפחות או פטור מוכר.`);
      else if (extra.haifaHebrewScore < policy.hebrew.unconditionalExamScore) {
        conditional = true;
        steps.push(
          policy.hebrew.facultyConditionalMinimum
            ? 'ציון עברית 115–119 מחייב אישור קבלה מותנית של הפקולטה למשפטים.'
            : 'קבלה מותנית בעברית מחייבת השלמה לציון 120 לפי כללי האוניברסיטה.',
        );
        if (extra.haifaHebrewScore <= 109)
          steps.push('בתשפ״ז נדרש קורס ״עברית באקדמיה לתואר״ ואישור החוג לקבלה המותנית.');
      }
    }
  }
  const lastSession = policy.deadlines?.latestPsychometricSession;
  if (lastSession) {
    if (extra.haifaPsychometricYear === undefined) missing.push('haifa_psychometric_year');
    else if (extra.haifaPsychometricYear >= Number(lastSession.slice(0, 4))) {
      if (extra.haifaPsychometricMonth === undefined) missing.push('haifa_psychometric_month');
      else if (
        `${extra.haifaPsychometricYear}-${String(extra.haifaPsychometricMonth).padStart(2, '0')}` >
        lastSession
      )
        reasons.push(`מועד הפסיכומטרי האחרון המוכר לחוג בתשפ״ז הוא ${lastSession}.`);
    }
  }
  if (policy.minimumPsychometricOverall !== undefined) {
    if (args.input.psychometric === undefined) missing.push('psychometric_overall');
    else if (args.input.psychometric < policy.minimumPsychometricOverall)
      reasons.push(`נדרש פסיכומטרי כללי ${policy.minimumPsychometricOverall} לפחות.`);
  }
  if (policy.minimumScienceUnits !== undefined) {
    if (extra.haifaScienceUnits === undefined) missing.push('haifa_science_units');
    else if (extra.haifaScienceUnits < policy.minimumScienceUnits)
      reasons.push('נדרשות לפחות 8 יחידות במקצועות המדעיים המוכרים לחוג לסיעוד.');
  }
  if (policy.programme === 'occupational_therapy') {
    if (extra.haifaOtFailedSelectionAttempts === undefined)
      missing.push('haifa_ot_failed_selection_attempts');
    else if (extra.haifaOtFailedSelectionAttempts >= 2)
      reasons.push('לא ניתן לגשת לניסיון מיון שלישי לאחר שני ניסיונות שלא צלחו.');
    if (extra.haifaOtUnjustifiedAbsence === undefined) missing.push('haifa_ot_unjustified_absence');
    else if (extra.haifaOtUnjustifiedAbsence)
      reasons.push('היעדרות מריאיון ללא הצדקה וללא הודעה מונעת ריאיון נוסף לפי תנאי החוג.');
  }
  if (reasons.length) return { kind: 'below', reasons };
  if (missing.length) return { kind: 'needs_input', requiredInputs: [...new Set(missing)] };
  if (args.score === undefined) return { kind: 'ready' };

  const deadline = policy.deadlines?.registration;
  if (deadline)
    steps.push(`מועד ההרשמה הרגיל שפורסם לתשפ״ז: ${deadline}. יש לבדוק אם הרשמה מאוחרת אפשרית.`);
  if (policy.deadlines?.documents)
    steps.push(`מועד הגשת המסמכים הרגיל: ${policy.deadlines.documents}.`);
  if (policy.registrationHeadline === 'ההרשמה נסגרה')
    steps.push('עמוד החוג מציין שההרשמה נסגרה; עמידה בתנאים אינה מבטיחה אפשרות להירשם כעת.');

  if (args.score >= policy.score.acceptance)
    return {
      kind: 'eligible',
      route: 'score',
      conditional,
      reason: `הסכם עומד בסף ${policy.score.acceptance} ותנאי הסף האקדמיים שנמסרו מתקיימים. ההחלטה הסופית נתונה לאוניברסיטה.`,
      steps,
    };
  if (
    policy.programme === 'law' &&
    (args.score >= 600 ||
      ((args.input.psychometric ?? 0) >= 660 &&
        extra.haifaAdmissionQualification === 'full_bagrut'))
  )
    return {
      kind: 'eligible',
      route: 'suitability',
      conditional,
      reason: 'מתקיימים תנאי הגישה לאפיק מבחן ההתאמה במשפטים; אין כאן קבלה ישירה לתואר.',
      steps: ['נדרש מעבר מבחן התאמה; הפקולטה מחליטה על קבלה לתואר או על אפיק אופק.', ...steps],
    };
  if (args.score < policy.score.publishedWaitingMinimum)
    return {
      kind: 'below',
      reasons: [
        `הסכם נמוך מסף ההמתנה ${policy.score.publishedWaitingMinimum} במסלול הסכם הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג.`,
      ],
    };
  if (policy.programme === 'communication')
    return {
      kind: 'eligible',
      route: 'ofek',
      conditional,
      reason: 'הסכם נמצא בטווח אפיק אופק בתקשורת; אין כאן קבלה ישירה לתואר.',
      steps: ['באפיק אופק נדרשים 2–3 קורסים בציון 70 לפחות, לפי תנאי החוג.', ...steps],
    };
  if (policy.programme === 'social_work')
    return {
      kind: 'eligible',
      route: 'score',
      conditional,
      reason: 'הסכם נמצא בטווח ההמתנה; גם מועמדים בטווח זה נדרשים למיון בחוג לעבודה סוציאלית.',
      steps,
    };
  return {
    kind: 'pending',
    route: 'score',
    conditional,
    reason:
      policy.programme === 'occupational_therapy'
        ? 'הסכם נמצא בטווח ההמתנה 595–609. אין זכאות אוטומטית למיון; החוג עשוי לפנות למועמדים שנבחרו.'
        : `הסכם נמצא בטווח ההמתנה ${policy.score.publishedWaitingMinimum}–${policy.score.acceptance - 1}; נדרשת החלטת החוג.`,
    steps,
  };
}
