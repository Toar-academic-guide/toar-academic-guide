'use client';

import type { BGU_PSYCHOLOGY_PROFILE_KEYS } from '@/lib/bguPsychologyInputs';
type Key = (typeof BGU_PSYCHOLOGY_PROFILE_KEYS)[number];
export type PsychologyFormValues = Partial<Record<Key, string>>;

export default function BguPsychologyFields({
  values,
  onChange,
  disabled,
  inputClassName,
}: {
  values: PsychologyFormValues;
  onChange: (key: Key, value: string) => void;
  disabled: boolean;
  inputClassName: string;
}) {
  return (
    <details className="col-span-full rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        פסיכולוגיה בבן־גוריון — קמפוס באר שבע
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        האפיקים שפורסמו: סכם 650 וגם פסיכומטרי 650; סכם או פסיכומטרי 680; ממוצע בגרות רשמי 113; או
        מכינה מוכרת של בן־גוריון בממוצע 94. נדרשים אנגלית בסיסי ועברית ה׳ או פטור תקף. מכסת המקומות
        מלאה כעת, ומועמדים שעומדים בתנאים יכולים להירשם לרשימת המתנה.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          אפיק פסיכולוגיה בבן־גוריון
          <select
            value={values.bguPsychologyRoute || 'auto'}
            onChange={(e) => onChange('bguPsychologyRoute', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            <option value="auto">בדיקת האפיקים המתאימים לנתונים</option>
            <option value="score">סכם ופסיכומטרי</option>
            <option value="psychometric">פסיכומטרי בלבד</option>
            <option value="bagrut">בגרות או מכינה ללא פסיכומטרי</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          האם קיימת תעודת קבלה מוכרת ומתקיימים תנאי החוג הנוסף בפסיכולוגיה?
          <select
            value={values.bguPsychologyRequirementsConfirmed || ''}
            onChange={(e) => onChange('bguPsychologyRequirementsConfirmed', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא ידוע</option>
            <option value="true">כן</option>
            <option value="false">לא</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          מכינה מוכרת של בן־גוריון לפסיכולוגיה
          <select
            value={values.bguPreparatoryTrack || ''}
            onChange={(e) => onChange('bguPreparatoryTrack', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא נבחרה מכינה</option>
            <option value="precise_sciences_engineering">מכינה למדעים מדויקים והנדסה</option>
            <option value="natural_life_sciences">מכינה למדעי הטבע והחיים</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          האם המכינה לפסיכולוגיה הושלמה?
          <select
            value={values.bguPreparatoryCompleted || ''}
            onChange={(e) => onChange('bguPreparatoryCompleted', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא ידוע</option>
            <option value="true">כן</option>
            <option value="false">לא</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          ממוצע מכינה מוכרת לפסיכולוגיה (0–100)
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={values.bguPreparatoryAverage || ''}
            onChange={(e) => onChange('bguPreparatoryAverage', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          />
        </label>
      </div>
    </details>
  );
}
