import type { BguQuantitativeInputs } from '@/lib/bguQuantitativeInputs';

export default function BguQuantitativeFields({
  value,
  onChange,
  disabled,
}: {
  value: BguQuantitativeInputs;
  onChange: (value: BguQuantitativeInputs) => void;
  disabled: boolean;
}) {
  const inputClass =
    'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50';
  const confirmations = [
    [
      'bguCertificateRequirementsConfirmed',
      'תעודת בגרות מלאה או תעודת קבלה חלופית המוכרת בבן־גוריון',
    ],
    ['bguPriorAcademicStudies', 'האם יש לימודים אקדמיים קודמים?'],
    ['bguReturningOrChangingTrack', 'האם חוזרים מהפסקת לימודים או משנים מסלול בחשבונאות?'],
    ['bguSecondTrackRequirementsConfirmed', 'האם מתקיימים תנאי החוג או החטיבה הנוספים, אם נבחרו?'],
    ['bguPreparatoryCompleted', 'האם המכינה המוכרת בבן־גוריון הושלמה?'],
  ] as const;
  return (
    <details className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        אפיקי בן־גוריון — מדעי החיים, כלכלה, מנהל עסקים וחשבונאות
      </summary>
      <p className="mt-3 text-xs text-slate-500">
        במסלולים אלה משתמשים בסכם הכמותי ובממוצע הרשמי של בן־גוריון או במכינה מוכרת. אפיקי בגרות
        זמינים למדעי החיים, כלכלה ומנהל עסקים. במדעי החיים יש גם אפיק פסיכומטרי 680 וכמותי 125 ללא
        ציון במתמטיקה. זכאות אינה מבטיחה מקום פנוי.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        במדעי החיים ניתן לשלב חטיבות קיימות, ניהול, רוח וחברה, אך לא מדעי ההתנהגות, פסיכולוגיה,
        סוציולוגיה, עבודה סוציאלית או תקשורת. בכלכלה יש לעמוד גם בחתך החטיבה הנבחרת. אם לא נבחר חוג
        או חטיבה נוספים, ניתן לסמן כן לתנאי החוג הנוסף.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          אפיק לבדיקה בבן־גוריון
          <select
            aria-label="אפיק לבדיקה בבן־גוריון"
            value={value.bguQuantitativeRoute ?? 'auto'}
            disabled={disabled}
            className={inputClass}
            onChange={(event) =>
              onChange({
                ...value,
                bguQuantitativeRoute: event.target
                  .value as BguQuantitativeInputs['bguQuantitativeRoute'],
              })
            }
          >
            <option value="auto">בדיקת האפיקים המתאימים לנתונים</option>
            <option value="quantitative">סכם כמותי</option>
            <option value="bagrut">בגרות או מכינה ללא פסיכומטרי</option>
            <option value="psychometric">פסיכומטרי בלבד — מדעי החיים</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          עדיפות הרשמה למדעי החיים בבן־גוריון
          <select
            aria-label="עדיפות הרשמה למדעי החיים בבן־גוריון"
            value={value.bguApplicationPriority ?? ''}
            disabled={disabled}
            className={inputClass}
            onChange={(event) =>
              onChange({
                ...value,
                bguApplicationPriority: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          >
            <option value="">לא ידוע</option>
            {[1, 2, 3, 4, 5, 6].map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        {confirmations.map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
            {label}
            <select
              aria-label={label}
              value={value[key]?.toString() ?? ''}
              disabled={disabled}
              className={inputClass}
              onChange={(event) =>
                onChange({
                  ...value,
                  [key]: event.target.value === '' ? undefined : event.target.value === 'true',
                })
              }
            >
              <option value="">לא ידוע</option>
              <option value="true">כן</option>
              <option value="false">לא</option>
            </select>
          </label>
        ))}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          מכינה מוכרת של בן־גוריון
          <select
            aria-label="מכינה מוכרת של בן־גוריון"
            value={value.bguPreparatoryTrack ?? ''}
            disabled={disabled}
            className={inputClass}
            onChange={(event) =>
              onChange({
                ...value,
                bguPreparatoryTrack: (event.target.value ||
                  undefined) as BguQuantitativeInputs['bguPreparatoryTrack'],
              })
            }
          >
            <option value="">לא נבחרה מכינה</option>
            <option value="precise_sciences_engineering">מכינה למדעים מדויקים והנדסה</option>
            <option value="natural_life_sciences">מכינה למדעי הטבע והחיים</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          ממוצע מכינה מוכרת בבן־גוריון (0–100)
          <input
            aria-label="ממוצע מכינה מוכרת בבן־גוריון"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={value.bguPreparatoryAverage ?? ''}
            disabled={disabled}
            className={inputClass}
            onChange={(event) =>
              onChange({
                ...value,
                bguPreparatoryAverage: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        </label>
      </div>
    </details>
  );
}
