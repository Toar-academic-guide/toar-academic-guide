import type { Program, InstitutionDetail } from '@/data/degrees/types';

export const HAIFA_PHYSIOTHERAPY_SOURCE =
  'https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3181/';
export const HAIFA_PHYSIOTHERAPY_NOTES = [
  'סכם 680 ומעלה; טווח המתנה 630–679. נדרשת בגרות מלאה או תעודת מכינה, ומתמטיקה ברמת 4 יח״ל בציון עובר. ריאיון קבלה לפי החלטת החוג.',
  'אנגלית ברמת מתקדמים א׳ ומעלה. עברית: יעלנט או מבחן סיווג של אוניברסיטת חיפה בציון 120 ומעלה, או סיום קורס עברית באקדמיה במכינה האוניברסיטאית.',
  'למשרתי מילואים, חיילים, זרועות הביטחון ומפונים: בגרות מלאה בממוצע משוקלל 100 ומעלה, מתמטיקה 4 יח״ל בציון 80 ומעלה, אנגלית 4 יח״ל בציון 85 ומעלה, דרישת העברית וריאיון. יש להגיש אישור שירות או ספח תעודת זהות למפונים.',
  'מכינת מדעים של אוניברסיטת חיפה או אוניברסיטה אחרת: ממוצע 93 ומעלה ללא בונוסים, אנגלית מתקדמים א׳, דרישת העברית, מתמטיקה 4 יח״ל בציון עובר וריאיון; הקבלה בשיקול ועדת הקבלה החוגית.',
  'בעלי תואר קודם יכולים להגיש מועמדות לפי סכם 680 ומעלה, עם טווח המתנה 630–679, כאשר ממוצע התואר מחליף את ממוצע הבגרות. נדרשות אנגלית מתקדמים א׳, דרישת העברית ומתמטיקה 4 יח״ל בציון עובר; ריאיון לפי החלטת החוג.',
  'ללא פסיכומטרי לבעלי תואר קודם: ממוצע 90 ומעלה בתואר הראשון, רמת פטור באנגלית, דרישת העברית, מתמטיקה 4 יח״ל בציון עובר וריאיון. הקבלה בשיקול ועדת הקבלה החוגית.',
] as const;

function correctedDetail(detail: InstitutionDetail): InstitutionDetail {
  return {
    ...detail,
    durationYears: 4,
    specificAdmissionNotes: [...HAIFA_PHYSIOTHERAPY_NOTES],
    programUrl: HAIFA_PHYSIOTHERAPY_SOURCE,
    // Remove only the two superseded legacy claims; keep unrelated facts intact.
    admissionFacts: detail.admissionFacts?.filter(
      (fact) =>
        !(
          fact.field === 'required_subject' &&
          /ביולוגיה/.test(`${fact.valueText} ${fact.description}`)
        ) && !(fact.field === 'interview' && fact.description === 'ראיון קבלה מחייב'),
    ),
  };
}

export function applyHaifaPhysiotherapyCopy<T extends Program>(program: T): T {
  if (!['physiotherapy', 'haifa_physiotherapy'].includes(program.id)) return program;
  const details = program.institutionDetails ?? [];
  const hasHaifa = details.some((detail) => detail.institutionName === 'אוניברסיטת חיפה');
  const institutionDetails = details.map((detail) =>
    detail.institutionName === 'אוניברסיטת חיפה' ? correctedDetail(detail) : detail,
  );
  if (!hasHaifa) {
    institutionDetails.push(
      correctedDetail({
        institutionName: 'אוניברסיטת חיפה',
        durationYears: 4,
        estimatedStudentsPerYear: '',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: [],
        officialCalculatorUrl: '',
      }),
    );
  }
  return {
    ...program,
    ...(program.id === 'haifa_physiotherapy' ? { admissionRequirements: [] } : {}),
    institutionDetails,
  };
}
