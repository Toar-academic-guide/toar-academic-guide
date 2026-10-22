import { Fragment } from 'react';

interface AdmissionRequirementsProps {
  requirements: string[];
  programId?: string;
  institutionId?: string;
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
      <RequirementList items={visible} />
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
