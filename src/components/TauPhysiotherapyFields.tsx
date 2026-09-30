import type { TauPhysiotherapyInputs } from '@/lib/tauPhysiotherapyInputs';
import {
  TAU_PHYSIOTHERAPY_REGISTRATION_URL,
  TAU_PHYSIOTHERAPY_SELECTION_URL,
} from '@/lib/tauPhysiotherapyInputs';

export type PhysiotherapyFormValues = Partial<Record<keyof TauPhysiotherapyInputs, string>>;
export default function TauPhysiotherapyFields({
  values,
  onChange,
  disabled,
  inputClassName,
}: {
  values: PhysiotherapyFormValues;
  onChange: (key: keyof PhysiotherapyFormValues, value: string) => void;
  disabled: boolean;
  inputClassName: string;
}) {
  const booleanOptions: Array<[string, string]> = [
    ['', 'לא ידוע'],
    ['true', 'כן'],
    ['false', 'לא'],
  ];
  function select(key: keyof PhysiotherapyFormValues, label: string, options = booleanOptions) {
    return (
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        {label}
        <select
          value={values[key] ?? ''}
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
  return (
    <details className="col-span-full rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        פיזיותרפיה באוניברסיטת תל אביב — תשפ״ז
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        באפיק הבגרות נדרש ממוצע הבגרות משדה הממוצע הרשמי של תל אביב, פסיכומטרי תקף 630 לפחות,
        מתמטיקה 4 יחידות בציון עובר או חלופה אקדמית מוכרת, ואנגלית 120 לפחות או חלופה מוכרת. מתמטיקה
        נלקחת ממקצועות הבגרות בפרופיל. הציון אינו אישור זימון לראיון או קבלה סופית.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {select('tauPhysiotherapyRoute', 'אפיק הקבלה לפיזיותרפיה בתל אביב', [
          ['', 'בחרו אפיק'],
          ['bagrut', 'בגרות — חישוב סכם רשמי'],
          ['preparatory', 'מכינה מוכרת — נדרשת בדיקה מוסדית'],
          ['partial_academic', 'לימודים אקדמיים חלקיים — נדרשת בדיקה מוסדית'],
          ['degree', 'תואר קודם — נדרשת בדיקה מוסדית'],
        ])}
        {select(
          'tauPhysiotherapyRequirementsConfirmed',
          'האם מתקיימים שאר תנאי ההגשה לפיזיותרפיה בתל אביב?',
        )}
        {select(
          'tauPhysiotherapyEnglishAlternativeConfirmed',
          'האם אושרה חלופה לדרישת האנגלית בפיזיותרפיה?',
        )}
        {select(
          'tauPhysiotherapyAcademicMathConfirmed',
          'האם אושר קורס אקדמי במתמטיקה כחלופה לבגרות?',
        )}
        {select(
          'tauPhysiotherapyMoocBonusConfirmed',
          'האם מגיע לך בונוס הקורס המקוון לפיזיותרפיה?',
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        אישור שאר התנאים כולל אזרחות ישראלית או תושבות קבע, תעודת קבלה מוכרת, דרישת העברית (105 עד
        הרישום ופטור עד תחילת שנה ב׳ למי שנדרש), עדיפות ראשונה, הרשמה לשנה א׳ בזמן וללא כישלון או
        הרחקה מתוכנית רפואה או מקצועות הבריאות. מועד הרישום שפורסם: 31.05.2026; יש לבדוק הרשמה
        מאוחרת מול האוניברסיטה.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        חלופת אנגלית: אמירנט 120, SAT מילולי 377, זכאות לתואר או קורס מתקדמים א׳ שאושר. בונוס 5
        נקודות ניתן לקורס ״המוח — המכונה המופלאה מכולן״ או ״מבוא למדעי הפסיכולוגיה״, בציון 85 לפחות
        במועד הבחינה הראשון, כשהתוצאה התקבלה במרשם עד 24.05.2026. שני קורסים אינם מעניקים בונוס
        כפול.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        מכינה: ממוצע 85 לפחות במסלול טבע או מדעים מדויקים. לימודים אקדמיים חלקיים: 40 שעות לפחות
        בממוצע 80 ומעלה, עם 25 שעות בציון מספרי אם יש ציונים בינאריים. תואר קודם: ממוצע 80 לפחות.
        האוניברסיטה בוחרת את הסכם הגבוה מהאפיקים המתאימים; החישוב כאן מוגבל לאפיק הבגרות.
      </p>
      <p className="mt-2 flex gap-4 text-xs text-indigo-700">
        <a
          href={TAU_PHYSIOTHERAPY_REGISTRATION_URL}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          תנאי הרישום
        </a>
        <a
          href={TAU_PHYSIOTHERAPY_SELECTION_URL}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          הליך הקבלה והספים
        </a>
      </p>
    </details>
  );
}
