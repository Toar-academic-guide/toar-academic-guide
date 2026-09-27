import type { BagrutSubject } from '@/types';
import type { BguEngineeringInputs } from '@/types/bguEngineering';
import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

export const BGU_ENGINEERING_PROGRAMS = {
  ee: { department: 361, cutoff: 547, minimumPsychometric: 600 },
  bgu_ee: { department: 361, cutoff: 547, minimumPsychometric: 600 },
  me: { department: 362, cutoff: 520, minimumPsychometric: 550 },
  bgu_me: { department: 362, cutoff: 520, minimumPsychometric: 550 },
  bgu_industrial: { department: 364, cutoff: 505, minimumPsychometric: 550 },
} as const;

export type BguEngineeringProgramId = keyof typeof BGU_ENGINEERING_PROGRAMS;
export const BGU_ENGINEERING_CALCULATOR_URL =
  'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=3';
export const BGU_ENGINEERING_SCORE_URL = 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitEngSekem';
export const BGU_ENGINEERING_GUIDE_URL =
  'https://www.bgu.ac.il/media/0p3ppz0n/ידיעון-תואר-ראשון.pdf';

export function isBguEngineeringProgram(id: string): id is BguEngineeringProgramId {
  return Object.hasOwn(BGU_ENGINEERING_PROGRAMS, id);
}

const BONUS_SUBJECT_CODES: Record<string, string> = {
  computer_science: '188',
  'מדעי המחשב': '188',
  מדעי_המחשב: '188',
  chemistry: '19',
  כימיה: '19',
  biology: '21',
  ביולוגיה: '21',
  machine_control: '122',
  'בקרת מכונות': '122',
  mechatronics: '438',
  מכטרוניקה: '438',
};

function subjectLabel(subjectId: string): string {
  if (!/^subject_(?:[0-9a-f]+_)*[0-9a-f]+$/i.test(subjectId)) return subjectId;
  const points = subjectId
    .slice(8)
    .split('_')
    .map((hex) => Number.parseInt(hex, 16));
  return points.every((point) => point <= 0x10ffff) ? String.fromCodePoint(...points) : subjectId;
}

/** The 2026/27 guide chooses the highest eligible subject; bonuses are not added together. */
export function bguIndustrialBonusSubject(subjects: readonly BagrutSubject[]) {
  return subjects
    .flatMap((subject) => {
      const code = BONUS_SUBJECT_CODES[subjectLabel(subject.subjectId)];
      return code && subject.units === 5 && subject.grade >= 80 ? [{ ...subject, code }] : [];
    })
    .sort((left, right) => right.grade - left.grade || left.code.localeCompare(right.code))[0];
}

function validGrade(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100;
}

function validAverage(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 50 && value <= 130;
}

function validUnits(value: unknown): value is 4 | 5 {
  return value === 4 || value === 5;
}

export type BguEngineeringInputResolution =
  | { kind: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { kind: 'below'; reason: string }
  | { kind: 'direct'; average: number; threshold: number; basis: 'bagrut' | 'preparatory' }
  | { kind: 'score'; parameters: URLSearchParams; physicsConditionOutstanding: boolean };

function completePair(units: unknown, grade: unknown) {
  return (units === undefined && grade === undefined) || (validUnits(units) && validGrade(grade));
}

function optionalDetailsValid(details: BguEngineeringInputs, now: Date): boolean {
  const hasPreparatory = [
    details.preparatoryMathUnits,
    details.preparatoryMathGrade,
    details.preparatoryPhysicsUnits,
    details.preparatoryPhysicsGrade,
    details.industrialPreparatoryAverage,
  ].some((value) => value !== undefined);
  const hasDiploma = [
    details.diplomaMathHours,
    details.diplomaMathGrade,
    details.diplomaPhysicsHours,
    details.diplomaPhysicsGrade,
  ].some((value) => value !== undefined);
  return (
    (!hasPreparatory ||
      (['bgu', 'technion'].includes(details.preparatoryInstitution ?? '') &&
        Number.isInteger(details.preparatoryCompletionYear) &&
        details.preparatoryCompletionYear! >= 2018 &&
        details.preparatoryCompletionYear! <= now.getUTCFullYear() &&
        completePair(details.preparatoryMathUnits, details.preparatoryMathGrade) &&
        completePair(details.preparatoryPhysicsUnits, details.preparatoryPhysicsGrade))) &&
    (!hasDiploma ||
      (details.diplomaRecognized === true &&
        ((details.diplomaMathHours === undefined && details.diplomaMathGrade === undefined) ||
          (Number.isInteger(details.diplomaMathHours) &&
            details.diplomaMathHours! >= 60 &&
            validGrade(details.diplomaMathGrade))) &&
        ((details.diplomaPhysicsHours === undefined && details.diplomaPhysicsGrade === undefined) ||
          (Number.isInteger(details.diplomaPhysicsHours) &&
            details.diplomaPhysicsHours! >= 90 &&
            validGrade(details.diplomaPhysicsGrade)))))
  );
}

export function resolveBguEngineeringInputs(
  programId: BguEngineeringProgramId,
  input: AdmissionsEvaluationInput,
  now = new Date(),
): BguEngineeringInputResolution {
  const config = BGU_ENGINEERING_PROGRAMS[programId];
  const extra = input.extraInputs;
  const details = extra?.bguEngineering;
  if (!details?.detailsConfirmed || !optionalDetailsValid(details, now))
    return { kind: 'needs_input', requiredInputs: ['bgu_engineering_details'] };
  if (extra?.bguLanguageRequirementsConfirmed === undefined)
    return { kind: 'needs_input', requiredInputs: ['bgu_language_requirements'] };
  if (!extra.bguLanguageRequirementsConfirmed)
    return { kind: 'below', reason: 'נדרשות אנגלית ברמה בסיסית ועברית ברמה ה׳ לנדרשים.' };
  const record = extra.bagrutSubjectRecord;
  const subjects = record?.subjects ?? [];
  if (
    subjects.some(
      (subject) =>
        !Number.isInteger(subject.units) ||
        subject.units < 1 ||
        subject.units > 5 ||
        !Number.isInteger(subject.grade) ||
        subject.grade < 0 ||
        subject.grade > 100,
    ) ||
    new Set(subjects.map((subject) => subject.subjectId)).size !== subjects.length
  )
    return { kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] };
  const math = subjects.find((subject) => subject.subjectId === 'mathematics');
  const physics = subjects.find((subject) => subject.subjectId === 'physics');
  const average = extra.bguBagrutAverage;
  const directSubjects =
    math?.units === 5 && math.grade >= 90 && physics?.units === 5 && physics.grade >= 90;
  if (config.department === 364 && details.route !== 'engineering_score' && directSubjects) {
    if (validAverage(average) && average >= 109)
      return { kind: 'direct', average, threshold: 109, basis: 'bagrut' };
    if (
      details.preparatoryInstitution === 'bgu' &&
      typeof details.industrialPreparatoryAverage === 'number' &&
      details.industrialPreparatoryAverage >= 91 &&
      details.industrialPreparatoryAverage <= 100
    )
      return {
        kind: 'direct',
        average: details.industrialPreparatoryAverage,
        threshold: 91,
        basis: 'preparatory',
      };
  }
  if (details.route === 'direct') {
    if (config.department !== 364)
      return { kind: 'below', reason: 'האפיק ללא פסיכומטרי מפורסם להנדסת תעשייה וניהול בלבד.' };
    if (!math || !physics)
      return { kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] };
    if (!validAverage(average) && details.industrialPreparatoryAverage === undefined)
      return { kind: 'needs_input', requiredInputs: ['bgu_bagrut_average'] };
    return {
      kind: 'below',
      reason:
        'באפיק זה נדרשים ממוצע בגרות 109 (או ממוצע מכינת בן־גוריון 91), מתמטיקה ופיזיקה 5 יחידות בציון 90.',
    };
  }
  if (input.psychometric === undefined)
    return { kind: 'needs_input', requiredInputs: ['psychometric_overall'] };
  if (
    !Number.isInteger(input.psychometric) ||
    input.psychometric < config.minimumPsychometric ||
    input.psychometric > 800
  )
    return {
      kind: 'below',
      reason: `באפיק הסכם נדרש פסיכומטרי ${config.minimumPsychometric} ומעלה.`,
    };
  const quantitative = extra.psychometricMath;
  if (!Number.isInteger(quantitative) || quantitative! < 50 || quantitative! > 150)
    return { kind: 'needs_input', requiredInputs: ['psychometric_math'] };
  const preparatoryMath =
    details.preparatoryMathUnits === undefined
      ? undefined
      : { units: details.preparatoryMathUnits, grade: details.preparatoryMathGrade! };
  const preparatoryPhysics =
    details.preparatoryPhysicsUnits === undefined
      ? undefined
      : { units: details.preparatoryPhysicsUnits, grade: details.preparatoryPhysicsGrade! };
  const diplomaMath =
    details.diplomaMathHours === undefined
      ? undefined
      : { units: details.diplomaMathHours >= 90 ? 5 : 4, grade: details.diplomaMathGrade! };
  const diplomaPhysics =
    details.diplomaPhysicsHours === undefined
      ? undefined
      : { units: 5, grade: details.diplomaPhysicsGrade! };
  // The guide explicitly recognizes qualifying diploma grades as Bagrut equivalents.
  const baseMath = math && validUnits(math.units) && validGrade(math.grade) ? math : diplomaMath;
  const basePhysics = [physics, diplomaPhysics]
    .filter((subject) => subject && validUnits(subject.units) && validGrade(subject.grade))
    .sort((left, right) => right!.units - left!.units || right!.grade - left!.grade)[0];
  if (!baseMath && !preparatoryMath && math)
    return { kind: 'below', reason: 'לחישוב סכם הנדסה נדרשת מתמטיקה בהיקף 4 או 5 יחידות.' };
  if (!baseMath && !preparatoryMath)
    return { kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] };
  if (baseMath && (!validUnits(baseMath.units) || !validGrade(baseMath.grade)))
    return { kind: 'below', reason: 'לחישוב סכם הנדסה נדרשת מתמטיקה בהיקף 4 או 5 יחידות.' };
  if (!validAverage(average) && !(preparatoryMath && preparatoryPhysics))
    return { kind: 'needs_input', requiredInputs: ['bgu_bagrut_average'] };
  const physicsPassed =
    (basePhysics?.units === 5 && basePhysics.grade >= 55) ||
    (preparatoryPhysics?.units === 5 && preparatoryPhysics.grade >= 56) ||
    details.physicsCoursePassed === true;
  const afterJuly =
    now.getUTCFullYear() > 2026 || (now.getUTCFullYear() === 2026 && now.getUTCMonth() >= 6);
  if (config.department === 361 && afterJuly && !physicsPassed) {
    if (details.physicsCoursePassed === undefined)
      return { kind: 'needs_input', requiredInputs: ['bgu_engineering_physics_course'] };
    return {
      kind: 'below',
      reason: 'החל מיולי נדרשים 5 יחידות פיזיקה בציון עובר או קורס מוכר שהושלם.',
    };
  }
  const bonus = config.department === 364 ? bguIndustrialBonusSubject(subjects) : undefined;
  const parameters = new URLSearchParams({
    rn_year: '2',
    rn_semester: '1',
    rn_eng_dprt_list: String(config.department),
    on_grade_classi_psycho: String(input.psychometric),
    on_grade_classi_quant: String(quantitative),
    on_bag_avg: validAverage(average) ? String(average) : '',
    on_learning_units_bag_math: baseMath ? String(baseMath.units) : '',
    on_grade_bag_math: baseMath ? String(baseMath.grade) : '',
    on_learning_units_bag_phy:
      basePhysics && validUnits(basePhysics.units) ? String(basePhysics.units) : '',
    on_grade_bag_phy: basePhysics && validUnits(basePhysics.units) ? String(basePhysics.grade) : '',
    on_subject: bonus?.code ?? '',
    on_learning_units_bonus: bonus ? '5' : '',
    on_grade_bonus: bonus ? String(bonus.grade) : '',
    on_subject2: '',
    on_learning_units_bonus2: '',
    on_grade_bonus2: '',
    on_subject3: '',
    on_learning_units_bonus3: '',
    on_grade_bonus3: '',
    on_learning_units_mech_math: preparatoryMath ? String(preparatoryMath.units) : '',
    on_grade_mech_math: preparatoryMath ? String(preparatoryMath.grade) : '',
    on_learning_units_mech_phy: preparatoryPhysics ? String(preparatoryPhysics.units) : '',
    on_grade_mech_phy: preparatoryPhysics ? String(preparatoryPhysics.grade) : '',
    on_learning_units_eng_math: diplomaMath ? String(diplomaMath.units) : '',
    on_grade_eng_math: diplomaMath ? String(diplomaMath.grade) : '',
  });
  return { kind: 'score', parameters, physicsConditionOutstanding: !physicsPassed };
}
