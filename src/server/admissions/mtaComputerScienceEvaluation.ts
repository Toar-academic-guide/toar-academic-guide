import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import { confirmationCondition, withScoreAssessment } from './scoreAssessment';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

/** The official calculator accepts only this open Bagrut range and psychometric domain. */
function combinedScore(bagrut: number | undefined, psychometric: number | undefined) {
  if (
    bagrut === undefined ||
    psychometric === undefined ||
    !(bagrut > 60 && bagrut < 130 && psychometric > 200 && psychometric <= 800)
  )
    return undefined;
  return Math.round((psychometric + (bagrut - 30) * 10) / 2);
}

export function evaluateMtaComputerScience({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const extra = input.extraInputs;
  const math = bagrutExamSubjects(extra?.bagrutSubjectRecord).find(
    (subject) => subject.subjectId === 'mathematics',
  );
  const units = math?.units ?? extra?.mathUnits;
  const grade = math?.grade ?? extra?.mathGrade;
  const english = extra?.psychometricEnglish;
  const bagrut = input.bagrut;
  const psychometric = input.psychometric;
  const combined = combinedScore(bagrut, psychometric);
  const base = {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'manual_gate' as const,
    kind: 'manual_gate' as const,
    confidence: 'medium' as const,
    sourceLabel: 'תנאי קבלה למדעי המחשב באקדמית תל־אביב–יפו',
    officialUrls: [
      'https://www.mta.ac.il/conditions_for_applying',
      'https://www.mta.ac.il/program/bsc_computer_science',
      'https://mtamn.mta.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1',
    ],
  };
  const missing: AdmissionsRequiredInput[] = [];
  if (units === undefined) missing.push('math_units');
  if (grade === undefined) missing.push('math_grade');
  if (english === undefined) missing.push('psychometric_english');
  if (missing.length)
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: missing,
      explanation:
        'לבדיקת תנאי הקבלה נדרשים יחידות וציון במתמטיקה וציון אנגלית בפסיכומטרי או באמיר״ם/אמירנ״ט.',
      nextAction: 'השלימו בפרופיל האקדמי את נתוני המתמטיקה ואת ציון האנגלית.',
    };

  const automaticMath = (units === 5 && grade! >= 70) || (units === 4 && grade! >= 90);
  const bagrutMath = (units === 5 && grade! >= 80) || (units === 4 && grade! >= 95);
  const reinforcedMath = (units === 5 && grade! >= 60) || (units === 4 && grade! >= 80);
  const combinedMet = combined !== undefined && combined >= 630;
  const psychometricMet = psychometric !== undefined && psychometric >= 670;
  const bagrutMet = bagrut !== undefined && bagrut >= 102 && bagrutMath;
  const automatic = automaticMath && (combinedMet || psychometricMet || bagrutMet);
  const reinforcedBagrut = bagrut !== undefined && bagrut >= 100;
  const reinforcedCombined =
    bagrut !== undefined && bagrut >= 95 && psychometric !== undefined && psychometric >= 550;
  const reinforced = reinforcedMath && (reinforcedBagrut || reinforcedCombined);
  const nextAction =
    'פנו למרכז ייעוץ ורישום לאישור הנתונים ולבירור אפשרויות הקבלה. אפשר לברר גם על מכינה שמחליפה את הפסיכומטרי.';

  if (!automatic && !reinforced) {
    if (bagrut === undefined) missing.push('bagrut_average');
    if (psychometric === undefined) missing.push('psychometric_overall');
    if (missing.length)
      return {
        ...base,
        capability: 'needs_input',
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: missing,
        explanation:
          'אין די נתונים לבדיקת כל חלופות הקבלה. הממוצע שהוזן משמש להערכה בלבד; המכללה מחשבת ממוצע משלה.',
        nextAction,
      };
  }

  let route = {
    score: combined ?? bagrut!,
    threshold: combined !== undefined ? 630 : 102,
    label: combined !== undefined ? 'ציון משולב משוער' : 'ממוצע בגרות משוער',
    text: 'לפי הנתונים שהוזנו, לא מתקיימת אף חלופה למסלול האוטומטי או למסלול המתוגבר',
  };
  if (automatic) {
    if (combinedMet) {
      route = {
        score: combined!,
        threshold: 630,
        label: 'ציון משולב משוער — מסלול אוטומטי',
        text: 'חלופת ציון משולב 630 לפחות',
      };
    } else if (psychometricMet) {
      route = {
        score: psychometric!,
        threshold: 670,
        label: 'פסיכומטרי — מסלול אוטומטי',
        text: 'חלופת פסיכומטרי 670 לפחות, בכפוף לזכאות לבגרות',
      };
    } else {
      route = {
        score: bagrut!,
        threshold: 102,
        label: 'ממוצע בגרות משוער — מסלול אוטומטי',
        text: 'חלופת בגרות 102 לפחות עם מתמטיקה 5 יחידות 80 לפחות או 4 יחידות 95 לפחות',
      };
    }
  } else if (reinforced) {
    route = {
      score: bagrut!,
      threshold: reinforcedBagrut ? 100 : 95,
      label: 'ממוצע בגרות משוער — מסלול מתוגבר',
      text: reinforcedBagrut
        ? 'מסלול מתוגבר: בגרות 100 לפחות עם רמת המתמטיקה הנדרשת'
        : 'מסלול מתוגבר: בגרות 95 לפחות ופסיכומטרי 550 לפחות עם רמת המתמטיקה הנדרשת',
    };
  }
  const meets = automatic || reinforced;
  return withScoreAssessment(
    {
      ...base,
      decision: meets ? 'eligible_to_apply' : 'below',
      score: route.score,
      threshold: route.threshold,
      scoreLabel: route.label,
      scoreAssessment: meets ? 'meets_threshold' : 'below_threshold',
      explanation: `${route.text}. ${!automaticMath ? 'דרישת המתמטיקה למסלול האוטומטי אינה מתקיימת. ' : ''}${reinforced && !automatic ? 'זו התאמה למסלול המתוגבר בלבד. ' : ''}הממוצע והציון המשולב הם הערכה לפי ממוצע הבגרות שהוזן; המכללה מחשבת ממוצע וציון משולב משלה. אין כאן אישור קבלה סופית.`,
      nextAction,
    },
    [
      confirmationCondition(
        'psychometric_english',
        'אנגלית 100 לפחות בפסיכומטרי או באמיר״ם/אמירנ״ט',
        english! >= 100,
      ),
      confirmationCondition(
        'bagrut_average',
        'זכאות לבגרות ועמידה בתנאי הסף הכלליים, ואישור הממוצע והנתונים בידי המכללה',
        undefined,
      ),
    ],
  );
}
