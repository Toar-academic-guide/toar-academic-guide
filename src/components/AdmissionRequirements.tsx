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
    <ul className="list-outside list-disc space-y-2 ps-5 leading-7">
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

export default function AdmissionRequirements({
  requirements,
  programId,
  institutionId,
}: AdmissionRequirementsProps) {
  const overview =
    programId === 'communication' && institutionId === 'tau'
      ? communicationOverview(requirements)
      : undefined;
  const visible = overview ?? requirements.slice(0, 3);
  const additional = overview ? requirements : requirements.slice(3);

  return (
    <div className="mt-3 text-right text-base text-[#35415b]" dir="rtl">
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
