'use client';

import type { BGU_SOCIAL_SCIENCE_PROFILE_KEYS } from '@/lib/bguSocialScienceInputs';
import type { PsychologyFormValues } from './BguPsychologyFields';

type Key = (typeof BGU_SOCIAL_SCIENCE_PROFILE_KEYS)[number];
export type SocialScienceFormValues = Partial<Record<Key, string>>;
type PrepKey = 'bguPreparatoryTrack' | 'bguPreparatoryAverage' | 'bguPreparatoryCompleted';

const booleanFields: Array<[Key, string]> = [
  [
    'bguSocialScienceRequirementsConfirmed',
    'האם יש תעודת קבלה מוכרת ומתקיימים תנאי החוג הנוסף ועדיפות ההרשמה?',
  ],
  [
    'bguSocialScienceLanguageConfirmed',
    'האם מתקיימים אנגלית בסיסי ועברית ה׳ (ו׳ לעבודה סוציאלית), לנדרשים, או פטור תקף?',
  ],
  ['bguReturningFromStudyBreak', 'האם זו חזרה מהפסקת לימודים בבן־גוריון?'],
];
const options: Array<[Key, string, Array<[string, string]>]> = [
  [
    'bguSocialScienceRoute',
    'אפיק במדעי החברה בבן־גוריון',
    [
      ['auto', 'בדיקת האפיקים המתאימים לנתונים'],
      ['score', 'סכם ופסיכומטרי לפי תנאי התוכנית'],
      ['psychometric', 'פסיכומטרי בלבד'],
      ['bagrut', 'בגרות או מכינה ללא פסיכומטרי'],
      ['age45', 'גיל 45 ומעלה — חינוך או פוליטיקה וממשל'],
      ['education_conditional', 'חינוך — בגרות עם תנאי באנגלית'],
    ],
  ],
  [
    'bguSocialWorkAcademicBackground',
    'רקע אקדמי קודם למועמדים לעבודה סוציאלית',
    [
      ['none', 'אין לימודים אקדמיים קודמים'],
      ['other', 'לימודים קודמים בתחום אחר'],
      ['social_work', 'לימודים קודמים בעבודה סוציאלית'],
    ],
  ],
];

export default function BguSocialScienceFields({
  values,
  onChange,
  prepValues,
  onPrepChange,
  disabled,
  inputClassName,
}: {
  values: SocialScienceFormValues;
  onChange: (key: Key, value: string) => void;
  prepValues: PsychologyFormValues;
  onPrepChange: (key: PrepKey, value: string) => void;
  disabled: boolean;
  inputClassName: string;
}) {
  const select = (key: Key, label: string, choices: Array<[string, string]>) => (
    <label key={key} className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
      {label}
      <select
        value={values[key] || ''}
        onChange={(event) => onChange(key, event.target.value)}
        disabled={disabled}
        className={inputClassName}
      >
        <option value="">לא ידוע</option>
        {choices.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <details className="col-span-full rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        מדעי החברה בבן־גוריון — קמפוס באר שבע
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        עבודה סוציאלית: סכם 580 וגם פסיכומטרי 550, או פסיכומטרי 630, בגרות רשמית 108 או מכינה 90;
        כרגע רשימת המתנה. תקשורת: סכם או פסיכומטרי 520, בגרות 98 או מכינה 70. חינוך: סכם או
        פסיכומטרי 520, בגרות 96 או מכינה 70. פוליטיקה וממשל: סכם או פסיכומטרי 500, בגרות 100 או
        מכינה 70. גיל 45 ומעלה הוא אפיק נוסף בחינוך ובפוליטיקה וממשל. הזינו ממוצע בגרות בשדה
        בן־גוריון שמתחת. יש לאשר את התנאים לתוכנית שאתם בודקים; בעבודה סוציאלית נדרשת עדיפות ראשונה
        או שנייה אחרי עבודה סוציאלית לצעירים.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {options.map(([key, label, choices]) => select(key, label, choices))}
        {booleanFields.map(([key, label]) =>
          select(key, label, [
            ['true', 'כן'],
            ['false', 'לא'],
          ]),
        )}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          גיל למועמדים באפיק גיל 45 ומעלה
          <input
            type="number"
            min={0}
            max={120}
            step={1}
            value={values.bguApplicantAge || ''}
            onChange={(event) => onChange('bguApplicantAge', event.target.value)}
            disabled={disabled}
            className={inputClassName}
          />
        </label>
        {values.bguSocialWorkAcademicBackground &&
          values.bguSocialWorkAcademicBackground !== 'none' && (
            <>
              {values.bguSocialWorkAcademicBackground === 'social_work' && (
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
                  ממוצע לימודים קודמים בעבודה סוציאלית (0–100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={values.bguSocialWorkAcademicAverage || ''}
                    onChange={(event) =>
                      onChange('bguSocialWorkAcademicAverage', event.target.value)
                    }
                    disabled={disabled}
                    className={inputClassName}
                  />
                </label>
              )}
              {select(
                'bguSocialWorkTranscriptProvided',
                'האם הוגש גיליון ציונים מעודכן, כולל סמסטר א׳?',
                [
                  ['true', 'כן'],
                  ['false', 'לא'],
                ],
              )}
              <p className="col-span-full text-xs text-slate-600">
                רקע אקדמי קודם מחייב דיון בוועדה. ללימודים קודמים בעבודה סוציאלית נדרש ממוצע 85
                ומעלה; אין קבלה לשנה ב׳.
              </p>
            </>
          )}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          מכינה מוכרת של בן־גוריון למדעי החברה
          <select
            value={prepValues.bguPreparatoryTrack || ''}
            onChange={(event) => onPrepChange('bguPreparatoryTrack', event.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא נבחרה מכינה</option>
            <option value="precise_sciences_engineering">מכינה למדעים מדויקים והנדסה</option>
            <option value="natural_life_sciences">מכינה למדעי הטבע והחיים</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          האם המכינה למדעי החברה הושלמה?
          <select
            value={prepValues.bguPreparatoryCompleted || ''}
            onChange={(event) => onPrepChange('bguPreparatoryCompleted', event.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא ידוע</option>
            <option value="true">כן</option>
            <option value="false">לא</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
          ממוצע מכינה מוכרת למדעי החברה (0–100)
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={prepValues.bguPreparatoryAverage || ''}
            onChange={(event) => onPrepChange('bguPreparatoryAverage', event.target.value)}
            disabled={disabled}
            className={inputClassName}
          />
        </label>
        {values.bguSocialScienceRoute === 'education_conditional' && (
          <>
            <p className="col-span-full text-xs leading-relaxed text-slate-600">
              אפיק חינוך המותנה שפורסם בספטמבר 2026 דורש בגרות רשמית 96, אנגלית 5 יחידות בציון 80
              לפחות ללא סיווג באנגלית, עברית ה׳ או פטור וחוג שני מהרשימה. הזינו אנגלית באשף מקצועות
              הבגרות. ההקלה הישנה בפוליטיקה וממשל הסתיימה ביולי.
            </p>
            {select('bguEducationSecondDepartment', 'החוג השני באפיק חינוך המותנה באנגלית', [
              ['philosophy', 'פילוסופיה'],
              ['middle_east', 'לימודי מזרח תיכון'],
              ['art', 'אמנות'],
              ['israel_studies', 'לימודי מדינת ישראל'],
              ['other', 'חוג אחר'],
            ])}
            {select('bguEnglishClassificationMissing', 'האם חסר סיווג רמת אנגלית?', [
              ['true', 'כן'],
              ['false', 'לא'],
            ])}
            {select('bguHebrewRequirementsConfirmed', 'האם מתקיימת עברית ה׳ לנדרשים או פטור תקף?', [
              ['true', 'כן'],
              ['false', 'לא'],
            ])}
            {select(
              'bguEducationEnglishConditionAcknowledged',
              'האם מקובל עליכם להשיג אנגלית בסיסי עד סוף סמסטר א׳?',
              [
                ['true', 'כן'],
                ['false', 'לא'],
              ],
            )}
          </>
        )}
      </div>
    </details>
  );
}
