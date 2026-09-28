'use client';

import type { BguEngineeringInputs } from '@/types/bguEngineering';

const numericFields = [
  ['preparatoryCompletionYear', 'שנת סיום המכינה (2018 ואילך)', 2018, 2100],
  ['preparatoryMathUnits', 'יחידות מתמטיקה במכינה (4 או 5)', 4, 5],
  ['preparatoryMathGrade', 'ציון מתמטיקה במכינה', 1, 100],
  ['preparatoryPhysicsUnits', 'יחידות פיזיקה במכינה (4 או 5)', 4, 5],
  ['preparatoryPhysicsGrade', 'ציון פיזיקה במכינה', 1, 100],
  ['industrialPreparatoryAverage', 'ממוצע מכינת בן־גוריון למדעים מדויקים והנדסה', 0, 100],
  ['diplomaMathHours', 'שעות מתמטיקה או אלגברה ליניארית בתעודת הנדסאי', 60, undefined],
  ['diplomaMathGrade', 'ציון מתמטיקה בתעודת הנדסאי', 1, 100],
  ['diplomaPhysicsHours', 'שעות פיזיקה בתעודת הנדסאי', 90, undefined],
  ['diplomaPhysicsGrade', 'ציון פיזיקה בתעודת הנדסאי', 1, 100],
] as const;

export function BguEngineeringFields({
  value,
  onChange,
  disabled,
  inputClassName,
}: {
  value?: BguEngineeringInputs;
  onChange: (value: BguEngineeringInputs) => void;
  disabled?: boolean;
  inputClassName: string;
}) {
  const current = value ?? { detailsConfirmed: false };
  function update<Key extends keyof BguEngineeringInputs>(
    key: Key,
    next: BguEngineeringInputs[Key] | undefined,
  ) {
    const updated = { ...current };
    if (next === undefined) delete updated[key];
    else updated[key] = next;
    onChange(updated);
  }
  return (
    <details className="col-span-full rounded-lg border border-slate-200 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        נתונים להנדסה בבן־גוריון
      </summary>
      <div className="mt-4 flex flex-col gap-4 text-xs text-slate-600">
        <p>
          הזינו במחשבון הבגרות את כל מקצועות הבגרות הרלוונטיים, וכאן את ציוני המכינה או ההנדסאי
          המוכרים לפי כללי בן־גוריון. בסכם הנדסה נדרש גם הציון הכמותי. הזינו ממוצע רשמי אם החישוב
          משתמש בבגרות או בהנדסאי; בחישוב שמבוסס רק על ציוני מכינה אין צורך בו.
        </p>
        <label className="flex flex-col gap-1.5">
          אפיק בדיקה להנדסה בבן־גוריון
          <select
            aria-label="אפיק בדיקה להנדסה בבן־גוריון"
            value={current.route ?? 'auto'}
            onChange={(event) =>
              update('route', event.target.value as BguEngineeringInputs['route'])
            }
            disabled={disabled}
            className={inputClassName}
          >
            <option value="auto">בדיקת האפיקים המתאימים לנתונים שלי</option>
            <option value="engineering_score">סכם הנדסה</option>
            <option value="direct">ללא פסיכומטרי — תעשייה וניהול בלבד</option>
          </select>
        </label>
        <p>
          לתעשייה וניהול ללא פסיכומטרי: ממוצע רשמי 109, מתמטיקה ופיזיקה 5 יחידות בציון 90. ממוצע
          מכינת בן־גוריון 91 יכול להחליף את ממוצע הבגרות באפיק זה.
        </p>
        <label className="flex flex-col gap-1.5">
          האם הושלם קורס פיזיקה מוכר על ידי בן־גוריון?
          <select
            aria-label="השלמת קורס פיזיקה מוכר בבן־גוריון"
            value={current.physicsCoursePassed?.toString() ?? ''}
            onChange={(event) =>
              update(
                'physicsCoursePassed',
                event.target.value === '' ? undefined : event.target.value === 'true',
              )
            }
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא ידוע או לא רלוונטי</option>
            <option value="true">כן</option>
            <option value="false">לא</option>
          </select>
        </label>
        <p>
          פיזיקה 5 יחידות בציון 55 בבגרות או 56 במכינה מוכרת פוטרת מהקורס. בהנדסת חשמל נדרשת השלמה
          החל מיולי; בתוכניות האחרות ייתכן חיוב בקורס לפני תחילת הלימודים.
        </p>
        <label className="flex flex-col gap-1.5">
          מוסד המכינה המוכרת
          <select
            aria-label="מוסד המכינה המוכרת להנדסה"
            value={current.preparatoryInstitution ?? ''}
            onChange={(event) =>
              update(
                'preparatoryInstitution',
                event.target.value === '' ? undefined : (event.target.value as 'bgu' | 'technion'),
              )
            }
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא למדתי במכינה מוכרת</option>
            <option value="bgu">בן־גוריון</option>
            <option value="technion">הטכניון</option>
          </select>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {numericFields.map(([key, label, min, max]) => (
            <label key={key} className="flex flex-col gap-1.5">
              {label}
              <input
                aria-label={label}
                type="number"
                min={min}
                max={max}
                step={key === 'industrialPreparatoryAverage' ? 0.01 : 1}
                value={current[key] ?? ''}
                placeholder="לא רלוונטי"
                disabled={disabled}
                className={inputClassName}
                onChange={(event) =>
                  update(key, event.target.value === '' ? undefined : Number(event.target.value))
                }
              />
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          האם יש תעודת הנדסאי מוסמך שהושלמה ומוכרת לפי כללי בן־גוריון?
          <select
            aria-label="תעודת הנדסאי מוסמך מוכרת בבן־גוריון"
            value={current.diplomaRecognized?.toString() ?? ''}
            onChange={(event) =>
              update(
                'diplomaRecognized',
                event.target.value === '' ? undefined : event.target.value === 'true',
              )
            }
            disabled={disabled}
            className={inputClassName}
          >
            <option value="">לא רלוונטי או לא ידוע</option>
            <option value="true">כן</option>
            <option value="false">לא</option>
          </select>
        </label>
        <p>
          בהנדסאי: מתמטיקה 60–89 שעות שווה 4 יחידות ו־90 שעות ומעלה שוות 5; פיזיקה 90 שעות ומעלה
          שווה 5 יחידות. בשדה הממוצע הרשמי הזינו את הממוצע המוכר: 40% מקצועות פנימיים בהיקף 60 שעות
          ומעלה, 40% בחינות חיצוניות ו־20% פרויקט גמר. תעודת טכנאי אינה מוכרת לאפיק זה.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            aria-label="כל נתוני ההנדסה הרלוונטיים הוזנו"
            checked={current.detailsConfirmed}
            disabled={disabled}
            onChange={(event) => update('detailsConfirmed', event.target.checked)}
          />
          הזנתי את כל מקצועות המדעים והטכנולוגיה ואת כל ציוני המכינה או ההנדסאי הרלוונטיים. שדות
          ריקים אינם רלוונטיים לי.
        </label>
        <a
          className="underline"
          href="https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=3"
          target="_blank"
          rel="noopener noreferrer"
        >
          מחשבון ההנדסה הרשמי של בן־גוריון
        </a>
      </div>
    </details>
  );
}
