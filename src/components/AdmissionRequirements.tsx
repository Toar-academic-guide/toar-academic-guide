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

function RequirementList({ items }: { items: string[] }) {
  return (
    <ul className="list-outside list-disc space-y-3 ps-5 leading-7 marker:text-[#6554b8]">
      {items.map((text, index) => (
        <li key={`${index}:${text}`}>
          {text.split(/(\d+(?:[.,]\d+)?)/).map((part, partIndex) =>
            partIndex % 2 ? (
              <strong key={partIndex} className="font-bold text-[#19233d]">
                {part}
              </strong>
            ) : (
              <Fragment key={partIndex}>{part}</Fragment>
            ),
          )}
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
    {
      title: 'סכם ופסיכומטרי — שני התנאים יחד',
      items: ['סכם 650 לפחות', 'פסיכומטרי 650 לפחות'],
    },
    {
      title: 'לחלופין — אחד מהציונים הבאים',
      items: ['סכם 680 לפחות', 'פסיכומטרי 680 לפחות'],
    },
    {
      title: 'ללא פסיכומטרי — אחת מהאפשרויות',
      items: [
        'ממוצע בגרות 113 לפחות',
        'מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 94 לפחות',
      ],
    },
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
    <div className="mt-3 text-right text-base text-[#35415b]" dir="rtl">
      {routes && (
        <>
          <p className="mb-4 leading-7">
            סכם הוא ציון שמשלב בגרות ופסיכומטרי לפי חישוב האוניברסיטה.
          </p>
          <div className="mb-5 space-y-3">
            {routes.map((route) => (
              <section
                key={route.title}
                aria-label={route.title}
                className="rounded-xl border border-[#dce1ee] bg-[#f8f9fd] p-4"
              >
                <p className="mb-2 font-semibold text-[#19233d]">{route.title}</p>
                <RequirementList items={route.items} />
              </section>
            ))}
          </div>
        </>
      )}
      {overview && <p className="mb-2 font-semibold">אחד מאפיקי הקבלה:</p>}
      <RequirementList items={visible} />
      {additional.length > 0 && (
        <details className="group mt-4 border-t border-[#dce1ee] pt-3">
          <summary className="w-fit cursor-pointer rounded-sm py-2 font-semibold text-[#6554b8] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6554b8]">
            {overview ? 'כל התנאים ודרכי קבלה נוספות' : 'תנאים נוספים'}
          </summary>
          <div className="pt-3">
            <RequirementList items={additional} />
          </div>
        </details>
      )}
    </div>
  );
}
