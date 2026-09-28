import type { BguHealthInputs } from '@/lib/bguHealthInputs';

export type HealthFormValues = Partial<Record<keyof BguHealthInputs, string>>;
export default function BguHealthFields({
  values,
  onChange,
  disabled,
  inputClassName,
}: {
  values: HealthFormValues;
  onChange: (key: keyof HealthFormValues, value: string) => void;
  disabled: boolean;
  inputClassName: string;
}) {
  function select(key: keyof HealthFormValues, label: string, options: Array<[string, string]>) {
    return (
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        {label}
        <select
          value={values[key] || ''}
          onChange={(e) => onChange(key, e.target.value)}
          disabled={disabled}
          className={inputClassName}
        >
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const booleanOptions: Array<[string, string]> = [
    ['', 'לא ידוע'],
    ['true', 'כן'],
    ['false', 'לא'],
  ];
  return (
    <details className="col-span-full rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        ריפוי בעיסוק ופיזיותרפיה בבן־גוריון — קמפוס באר שבע
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        ריפוי בעיסוק: סכם 620 וגם פסיכומטרי 600; פיזיותרפיה: סכם 667 וגם פסיכומטרי 667. נדרש ממוצע
        הבגרות הרשמי של בן־גוריון. אלה תנאים לשלב הראיון בלבד; הזימון והקבלה נקבעים בידי
        האוניברסיטה. ההרשמה למחזור הנוכחי סגורה, והמסמכים נדרשו עד 25.05.2026.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {select('bguOccupationalTherapyRoute', 'אפיק ריפוי בעיסוק בבן־גוריון', [
          ['', 'לא נבחר — בדיקת סכם ופסיכומטרי'],
          ['score', 'סכם ופסיכומטרי'],
          ['academic', 'דיון במחלקה לבוגרי תואר ללא פסיכומטרי'],
        ])}
        {select(
          'bguOccupationalTherapyRequirementsConfirmed',
          'ריפוי בעיסוק: תעודת קבלה מוכרת, אנגלית מתקדמים א׳, עברית ו׳ או פטור תקף, עדיפות ראשונה או שנייה אחרי רפואה/פיזיותרפיה ורישום ומסמכים בזמן?',
          booleanOptions,
        )}
        {select('bguOccupationalTherapyExamSession', 'מועד הבחינה לריפוי בעיסוק', [
          ['', 'לא ידוע'],
          ['regular', 'מועד רגיל'],
          ['july_psychometric', 'פסיכומטרי יולי — מקום פנוי בלבד'],
          ['spring_nativ', 'נתיב אביב — מקום פנוי בלבד'],
        ])}
        {select('bguBachelorsDegreeCompleted', 'האם התואר הראשון הושלם?', booleanOptions)}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          ממוצע תואר ראשון לריפוי בעיסוק (0–100)
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={values.bguBachelorsDegreeAverage || ''}
            onChange={(e) => onChange('bguBachelorsDegreeAverage', e.target.value)}
            disabled={disabled}
            className={inputClassName}
          />
        </label>
        {select(
          'bguPhysiotherapyRequirementsConfirmed',
          'פיזיותרפיה: תעודת קבלה מוכרת, אנגלית מתקדמים ב׳, עברית ו׳ או פטור תקף, עדיפות ראשונה, פסיכומטרי עד אפריל או נתיב עד סתיו ורישום ומסמכים בזמן?',
          booleanOptions,
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        בוגרי תואר ראשון בכל תחום בממוצע 85 ומעלה יכולים לעבור לדיון במחלקת ריפוי בעיסוק ללא
        פסיכומטרי; אין הבטחת ראיון. בריפוי בעיסוק נדרשים לראיון הצהרת בריאות ואישור מרופא משפחה.
        בפיזיותרפיה יוזמנו בעלי הסכם והפסיכומטרי הגבוהים ביותר לאחר תוצאות אפריל.{' '}
        <a
          href="https://www.bgu.ac.il/welcome/contents/admissions-forms/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          טפסי הראיון הרשמיים
        </a>
      </p>
    </details>
  );
}
