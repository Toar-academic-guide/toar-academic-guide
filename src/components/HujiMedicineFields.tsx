'use client';

import type { HujiMedicineInputs } from '@/lib/hujiMedicineInputs';
export type MedicineFormValues = Partial<Record<keyof HujiMedicineInputs, string>>;
type Props = {
  values: MedicineFormValues;
  onChange: (key: keyof HujiMedicineInputs, value: string) => void;
  disabled: boolean;
  inputClassName: string;
};

export default function HujiMedicineFields({ values, onChange, disabled, inputClassName }: Props) {
  function select(key: keyof HujiMedicineInputs, label: string, options: [string, string][]) {
    return (
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        {label}
        <select
          value={values[key] ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          disabled={disabled}
          className={inputClassName}
        >
          <option value="">לא ידוע / לא הוזן</option>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function number(
    key: keyof HujiMedicineInputs,
    label: string,
    min: number,
    max: number,
    step: string = 'any',
  ) {
    return (
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        {label}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={values[key] ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          disabled={disabled}
          className={inputClassName}
        />
      </label>
    );
  }
  const yesNo: [string, string][] = [
    ['true', 'כן'],
    ['false', 'לא'],
  ];
  const route = values.hujiMedicineRoute || 'bagrut';
  return (
    <details className="col-span-full rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        רפואה באוניברסיטה העברית — תשפ״ז
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        הציון הקוגניטיבי קובע מעבר למיון; הציון הסופי כולל מו״ר/מרק״ם. הזינו רק נתונים ידועים. ללא
        נתוני המיון ותנאי הקבלה לא ניתן לקבוע זכאות סופית. ממוצע הבגרות נדרש לפי חישוב העברית. לאפיק
        לימודים אקדמיים יש להזין ציון קוגניטיבי שנמסר ממדור הקבלה.
      </p>
      <p className="mt-2 text-xs text-slate-600">
        הזינו את ציון המיון הגבוה התקף בשנים 2024–2026; אם נבחנתם יותר מפעם בשנה, רק הבחינה הראשונה
        באותה שנה נחשבת. ציון מ־2023 דורש הבהרה מוסדית. לאחר הזימון נדרשים גם הצהרת בריאות והשלמת
        הדרישות הרפואיות של הפקולטה.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {select('hujiMedicineAffirmativeAction', 'מעמד ראויים לקידום לרפואה בעברית', [
          ['standard', 'אפיק רגיל — ללא מעמד ראויים לקידום'],
          ['eligible', 'מעמד ראויים לקידום'],
        ])}
        {select('hujiMedicineRoute', 'אפיק חישוב לרפואה בעברית', [
          ['bagrut', 'בגרות'],
          ['huji_preparatory', 'מכינת העברית'],
          ['other_preparatory', 'מכינה אחרת מוכרת'],
          ['official_cognitive', 'ציון קוגניטיבי רשמי ממדור הקבלה'],
        ])}
        {route === 'bagrut' &&
          number('hujiBagrutAverage', 'ממוצע בגרות רשמי של העברית (60–127)', 60, 127)}
        {route === 'official_cognitive' &&
          number('hujiMedicineCognitiveScore', 'ציון קוגניטיבי רשמי לרפואה (16–30)', 16, 30)}
        {(route === 'huji_preparatory' || route === 'other_preparatory') && (
          <>
            {number(
              'hujiMedicinePreparatoryAverage',
              route === 'other_preparatory'
                ? 'ממוצע מכינה שהומר במדור הקבלה לסולם העברית (60–113)'
                : 'ממוצע מכינה לרפואה בעברית (60–113)',
              60,
              113,
            )}
            {number('hujiMedicinePreparatoryYear', 'שנת סיום מכינה לרפואה בעברית', 1900, 2026, '1')}
            {select(
              'hujiMedicinePreparatoryEligible',
              'מדור הקבלה אישר שהמכינה ומסלול הטבע מוכרים ותקפים למחזור תשפ״ז?',
              yesNo,
            )}
            {route === 'other_preparatory' && (
              <>
                {select(
                  'hujiMedicinePreparatoryConversionConfirmed',
                  'מדור הקבלה המיר את ממוצע המכינה לסולם העברית?',
                  yesNo,
                )}
                <p className="col-span-full text-xs text-slate-600">
                  מכינה אחרת מוכרת מכל השנים מחייבת המרת הציון במדור הקבלה לפני החישוב. הזינו את
                  הממוצע שהתקבל לאחר ההמרה.
                </p>
              </>
            )}
          </>
        )}
        {number('hujiMedicineAssessmentScore', 'ציון מו״ר/מרק״ם לרפואה בעברית (150–250)', 150, 250)}
        {number('hujiMedicineAssessmentYear', 'שנת מו״ר/מרק״ם לרפואה בעברית', 1900, 2026, '1')}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          תאריך הפסיכומטרי לרפואה בעברית
          <input
            type="date"
            value={values.hujiMedicinePsychometricDate ?? ''}
            onChange={(e) => onChange('hujiMedicinePsychometricDate', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          />
        </label>
        {select('hujiMedicineEnglishBasis', 'הוכחת אנגלית לרפואה בעברית', [
          ['score', 'ציון אנגלית'],
          ['exempt', 'פטור מוכר'],
        ])}
        {values.hujiMedicineEnglishBasis === 'score' &&
          number('hujiMedicineEnglishScore', 'ציון אנגלית לרפואה בעברית (50–150)', 50, 150, '1')}
        {select('hujiMedicineHebrewBasis', 'הוכחת עברית לרפואה בעברית', [
          ['hebrew_school', 'לימודים בתיכון בעברית'],
          ['yael', 'ציון יע״ל/יעלנט'],
          ['level_e', 'רמה ה׳ מוכרת'],
          ['exempt', 'פטור מוכר'],
        ])}
        {values.hujiMedicineHebrewBasis === 'yael' &&
          number('hujiMedicineHebrewScore', 'ציון עברית לרפואה בעברית (0–150)', 0, 150, '1')}
        {select(
          'hujiMedicineResidencyEligible',
          'אזרחות ישראלית או תושבות קבע לרפואה בעברית?',
          yesNo,
        )}
        {select(
          'hujiMedicineQualificationConfirmed',
          'זכאות לבגרות או תעודה חלופית מוכרת לרפואה בעברית?',
          yesNo,
        )}
        {select(
          'hujiMedicineRegistrationConfirmed',
          'הרשמה והמסמכים לרפואה בעברית הושלמו עד 12.05.2026?',
          yesNo,
        )}
        {select(
          'hujiMedicinePriorStudyStatus',
          'לימודים קודמים ברפואה, רפואת שיניים או הפסקת לימודי בריאות',
          [
            ['none', 'אין לימודים רלוונטיים המחייבים בדיקה'],
            ['documents_submitted', 'רפואה/שיניים בחמש השנים האחרונות — המסמכים הוגשו'],
            ['committee_approved', 'לאחר הפסקת לימודי בריאות — התקבל אישור ועדה'],
            ['documents_and_committee_approved', 'המסמכים הוגשו וגם התקבל אישור ועדה'],
            ['review_needed', 'נדרשת בדיקת מדור הקבלה'],
          ],
        )}
      </div>
    </details>
  );
}
