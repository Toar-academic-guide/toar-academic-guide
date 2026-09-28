'use client';

import type { HaifaAdmissionsInputs } from '@/lib/haifaAdmissionsInputs';

export type HaifaQualificationValues = Partial<Record<keyof HaifaAdmissionsInputs, string>>;
type Field = {
  key: keyof HaifaAdmissionsInputs;
  label: string;
  help?: string;
  options?: [string, string][];
  min?: number;
  max?: number;
  type?: 'date';
};
const fields: Field[] = [
  {
    key: 'haifaAdmissionQualification',
    label: 'תעודת הקבלה לאוניברסיטת חיפה',
    options: [
      ['full_bagrut', 'תעודת בגרות מלאה'],
      ['recognized_equivalent', 'תעודה מקבילה שהוכרה על ידי חיפה'],
      ['none', 'אין תעודת קבלה מוכרת'],
    ],
  },
  {
    key: 'haifaPsychometricMonth',
    label: 'חודש הבחינה הפסיכומטרית לחיפה',
    min: 1,
    max: 12,
    help: 'של אותה בחינה שאת שנתה ואת ציוניה הזנתם. לחלק מהחוגים יש מועד בחינה אחרון מוכר.',
  },
  {
    key: 'haifaEnglishLevel',
    label: 'רמת האנגלית הרשמית העדכנית בחיפה',
    options: [
      ['pre_basic', 'טרום־בסיסי'],
      ['basic', 'בסיסי'],
      ['advanced_a', 'מתקדמים א׳'],
      ['advanced_b', 'מתקדמים ב׳'],
      ['exempt', 'פטור'],
    ],
    help: 'אם לא הוזנה רמה עדכנית ממבחן מיון או מקורס מוכר, נשתמש בציון האנגלית בפסיכומטרי.',
  },
  {
    key: 'haifaHebrewQualification',
    label: 'הבסיס לעמידה בדרישת העברית בחיפה',
    options: [
      ['hebrew_school', 'לימודים בבית ספר ששפת ההוראה בו עברית'],
      ['hebrew_psychometric', 'הפסיכומטרי ששימש לקבלה נערך בעברית'],
      ['hebrew_engineer', 'דיפלומת הנדסאי מוכרת: לימודים ובחינת רישוי בעברית'],
      ['degree_course', 'הושלם הקורס ״עברית באקדמיה לתואר״'],
      ['exam', 'ציון מבחן עברית (יע״ל / יעלנט)'],
      ['university_exam', 'ציון מבחן סיווג עברית באוניברסיטת חיפה'],
    ],
    help: 'הקורס ״עברית באקדמיה״ ללא ״לתואר״ אינו מקנה את הפטור הזה.',
  },
  { key: 'haifaHebrewScore', label: 'ציון מבחן העברית בחיפה', min: 50, max: 150 },
  {
    key: 'haifaHebrewExamDate',
    label: 'תאריך מבחן העברית בחיפה',
    type: 'date',
    help: 'תאריך הבחינה בפועל, לבדיקת תוקף הציון ומועדי החוג.',
  },
  {
    key: 'haifaScienceUnits',
    label: 'מספר היחידות המדעיות לסיעוד בחיפה',
    min: 0,
    max: 35,
    help: 'סכום היחידות במתמטיקה, פיזיקה, כימיה, ביולוגיה ומדעי הרפואה או הבריאות בלבד.',
  },
  {
    key: 'haifaOtFailedSelectionAttempts',
    label: 'ניסיונות מיון שלא צלחו בריפוי בעיסוק בחיפה',
    min: 0,
    max: 10,
  },
  {
    key: 'haifaOtUnjustifiedAbsence',
    label: 'היעדרות מריאיון בריפוי בעיסוק בחיפה ללא הצדקה וללא הודעה',
    options: [
      ['false', 'לא'],
      ['true', 'כן'],
    ],
  },
];

export default function HaifaQualificationFields(props: {
  values: HaifaQualificationValues;
  onChange: (key: keyof HaifaAdmissionsInputs, value: string) => void;
  disabled: boolean;
  inputClassName: string;
}) {
  return (
    <details className="col-span-full rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">
        תנאי החוגים באוניברסיטת חיפה
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        מלאו את הנתונים הידועים לכם. מתמטיקה ויחידותיה נלקחות ממקצועות הבגרות בפרופיל. ראיונות
        ומבחני התאמה יופיעו בתוצאה כשלבים שנותרו.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields
          .filter(
            (field) =>
              !['haifaHebrewScore', 'haifaHebrewExamDate'].includes(field.key) ||
              ['exam', 'university_exam'].includes(props.values.haifaHebrewQualification ?? ''),
          )
          .map((field) => (
            <div key={field.key} className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={field.key} className="text-xs font-medium text-slate-600">
                {field.label}
              </label>
              {field.options ? (
                <select
                  id={field.key}
                  value={props.values[field.key] ?? ''}
                  onChange={(event) => props.onChange(field.key, event.target.value)}
                  disabled={props.disabled}
                  className={props.inputClassName}
                >
                  <option value="">לא ידוע</option>
                  {field.options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.key}
                  type={field.type ?? 'number'}
                  min={field.min}
                  max={field.max}
                  step={field.type ? undefined : 1}
                  placeholder="לא ידוע"
                  value={props.values[field.key] ?? ''}
                  onChange={(event) => props.onChange(field.key, event.target.value)}
                  disabled={props.disabled}
                  className={props.inputClassName}
                />
              )}
              {field.help && <p className="text-xs text-slate-500">{field.help}</p>}
            </div>
          ))}
      </div>
    </details>
  );
}
