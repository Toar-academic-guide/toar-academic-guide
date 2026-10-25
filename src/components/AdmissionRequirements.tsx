import { Fragment } from 'react';
import type { FloorCheckRow } from '@/types/admissionsEvaluation';
import { BIU_CALCULATOR_URL, BIU_ENGINEERING_URL } from '@/data/admissions/biuChannels';
import { institutionLink } from '@/lib/institutionLinks';

interface AdmissionRequirementsProps {
  requirements: string[];
  programId?: string;
  institutionId?: string;
  floorChecks?: FloorCheckRow[];
}

// Only shorten the verified TAU copy while the underlying conditions match.
// The full source wording remains available in the disclosure below.
function communicationOverview(requirements: string[]): string[] | undefined {
  const bagrut = requirements.find((text) =>
    text.startsWith('ללא פסיכומטרי: ממוצע בגרות 102 ומעלה;'),
  );
  const psychometric = requirements.find(
    (text) => text === 'פסיכומטרי כללי 640 ומעלה וזכאות לבגרות.',
  );
  const combined = requirements.find((text) => text.startsWith('ציון התאמה העומד בסף החוג.'));
  if (!bagrut || !psychometric || !combined) return undefined;
  return [bagrut.split(';')[0], psychometric, combined.split('. ')[0]];
}

function highlightedNumbers(text: string) {
  return text.split(/(\d+(?:[.,]\d+)?)/).map((part, index) =>
    index % 2 ? (
      <strong key={index} className="font-bold text-[#19233d]">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

function RequirementText({
  text,
  formulaOverview = false,
}: {
  text: string;
  formulaOverview?: boolean;
}) {
  const formula = text.match(
    formulaOverview
      ? /^(ציון משולב = |איך מחושב הציון המשולב: )(.+?)(, לפי .+)?$/
      : /^(ציון משולב = )(.+?)(, לפי .+)$/,
  );
  if (!formula) return highlightedNumbers(text);
  return (
    <>
      {formula[1]}
      <bdi dir="ltr" className="inline-block max-w-full align-middle">
        {formula[2].split(/([\u0590-\u05ff]+(?:\s+[\u0590-\u05ff]+)*)/).map((part, index) =>
          index % 2 ? (
            <bdi dir="rtl" key={index}>
              {part}
            </bdi>
          ) : (
            <Fragment key={index}>{highlightedNumbers(part)}</Fragment>
          ),
        )}
      </bdi>
      {formula[3]}
    </>
  );
}

export function RequirementList({
  items,
  formulaOverview = false,
}: {
  items: string[];
  formulaOverview?: boolean;
}) {
  return (
    <ul className="list-outside list-disc space-y-1 ps-4 leading-6 marker:text-[#6554b8]">
      {items.map((text, index) => (
        <li key={`${index}:${text}`}>
          <RequirementText text={text} formulaOverview={formulaOverview} />
        </li>
      ))}
    </ul>
  );
}

function psychologyRoutes(requirements: string[]) {
  // Presentation only. Do not reuse these labels if the published conditions change.
  if (
    requirements[0] !==
      'סכם 650 לפחות וגם פסיכומטרי 650 לפחות. אפיק נוסף: סכם 680 לפחות או פסיכומטרי 680 לפחות.' ||
    requirements[1] !==
      'ללא פסיכומטרי: ממוצע בגרות 113 לפחות, או מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 94.'
  )
    return undefined;
  return [
    'שני התנאים יחד: סכם 650 לפחות וגם פסיכומטרי 650 לפחות',
    'לחלופין: סכם 680 לפחות או פסיכומטרי 680 לפחות',
    'ללא פסיכומטרי: ממוצע בגרות 113 לפחות או מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 94 לפחות',
  ];
}

export default function AdmissionRequirements({
  requirements,
  programId,
  institutionId,
  floorChecks,
}: AdmissionRequirementsProps) {
  const routes =
    ['psychology', 'bgu_psychology'].includes(programId ?? '') && institutionId === 'bgu'
      ? psychologyRoutes(requirements)
      : undefined;
  const overview =
    programId === 'communication' && institutionId === 'tau'
      ? communicationOverview(requirements)
      : undefined;
  // A separately named route must not remain buried in the previous route's bullet.
  const visible = (overview ?? requirements.slice(routes ? 2 : 0, 3)).flatMap((text) =>
    text.split(/(?<=\.)\s+(?=אפיק נוסף:)/),
  );
  const additional = overview ? requirements : requirements.slice(3);

  return (
    <div className="mt-3 text-right text-sm text-[#35415b]" dir="rtl">
      {floorChecks && (
        <>
          <table
            className="w-full table-fixed border-collapse text-right text-xs leading-5"
            aria-label="בדיקת תנאי הסף לפי הציונים שלך"
          >
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th scope="col" className="w-[30%] py-2 pe-2 font-medium">
                  תנאי
                </th>
                <th scope="col" className="w-[15%] py-2 pe-2 font-medium">
                  נדרש
                </th>
                <th scope="col" className="w-[25%] py-2 pe-2 font-medium">
                  שלך
                </th>
                <th scope="col" className="w-[30%] py-2 font-medium">
                  בדיקה
                </th>
              </tr>
            </thead>
            {Array.from(new Set(floorChecks.map((row) => row.channel))).map((channel) => (
              <tbody key={channel}>
                <tr>
                  <th
                    colSpan={4}
                    scope="rowgroup"
                    className="pt-4 pb-1 font-semibold text-[#19233d]"
                  >
                    {channel}
                  </th>
                </tr>
                {floorChecks
                  .filter((row) => row.channel === channel)
                  .map((row, index) => {
                    const requirementLines =
                      typeof row.displayValue === 'string' && row.displayValue.includes('; ')
                        ? row.displayValue.split('; ')
                        : undefined;
                    return (
                      <Fragment key={`${row.label}:${index}`}>
                        <tr
                          className={
                            requirementLines
                              ? 'align-top'
                              : 'border-b border-[var(--border)] align-top'
                          }
                        >
                          <th
                            scope="row"
                            className="py-2 pe-2 font-normal [overflow-wrap:anywhere]"
                          >
                            <a
                              href={institutionLink(row.sourceUrl, institutionId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline decoration-[#c9c2e4] underline-offset-4 hover:text-[#6554b8] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                              {row.label}
                            </a>
                          </th>
                          <td className="py-2 pe-2 tabular-nums">
                            {requirementLines ? null : row.displayValue}
                          </td>
                          <td className="py-2 pe-2 tabular-nums whitespace-nowrap">
                            {row.studentValue ?? '—'}
                          </td>
                          <td className="py-2 [overflow-wrap:anywhere]">
                            <span>
                              {
                                (
                                  {
                                    pass: 'עומד/ת',
                                    miss: 'לא עומד/ת',
                                    missing: 'חסר נתון',
                                    conflicting: 'מקורות סותרים',
                                    soft_miss: 'לפי המחשבון: קבלה מותנית בקורס הכנה בקיץ',
                                  } as const
                                )[row.status]
                              }
                            </span>
                            {row.note && (
                              <span className="mt-1 block text-[var(--text-muted)]">
                                {row.note}
                              </span>
                            )}
                          </td>
                        </tr>
                        {requirementLines && (
                          <tr className="border-b border-[var(--border)]">
                            <td colSpan={4} className="pb-2 pe-2 tabular-nums">
                              {requirementLines.map((line) => (
                                <span key={line} className="block whitespace-nowrap">
                                  {line}
                                </span>
                              ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            ))}
          </table>
          <p className="mt-3 text-xs text-[var(--text-muted)] [overflow-wrap:anywhere]">
            {institutionId !== 'tau' &&
              programId !== 'biu_law' &&
              programId !== 'law' &&
              'עודכן לאחרונה: 25.10.2026 · מקור: אתר אוניברסיטת בר-אילן — '}
            <a
              href={
                institutionId === 'tau'
                  ? institutionLink(floorChecks[0]?.sourceUrl, 'tau')
                  : institutionLink(BIU_CALCULATOR_URL, 'biu')
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#6554b8] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {institutionId === 'tau' ? 'תנאי קבלה' : 'המחשבון הרשמי של בר-אילן'}
            </a>
            {programId === 'biu_ee' && (
              <>
                {'; '}
                <a
                  href={institutionLink(BIU_ENGINEERING_URL, 'biu')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  תנאי הקבלה בפקולטה להנדסה
                </a>
              </>
            )}
          </p>
        </>
      )}
      {routes && (
        <>
          <p className="mb-3 leading-6">
            סכם הוא ציון שמשלב בגרות ופסיכומטרי לפי חישוב האוניברסיטה.
          </p>
          <div className="mb-3">
            <RequirementList items={routes} />
          </div>
        </>
      )}
      {overview && <p className="mb-2 font-semibold">אחד מאפיקי הקבלה:</p>}
      {visible.length > 0 && <RequirementList items={visible} />}
      {additional.length > 0 && (
        <details className="group mt-3 border-t border-[#dce1ee] pt-1">
          <summary className="w-fit cursor-pointer rounded-sm py-2 font-semibold text-[#6554b8] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6554b8]">
            {overview ? 'כל התנאים ודרכי קבלה נוספות' : 'תנאים נוספים'}
          </summary>
          <div className="pt-1">
            <RequirementList items={additional} />
          </div>
        </details>
      )}
    </div>
  );
}
