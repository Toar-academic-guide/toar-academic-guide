import { PhysiotherapyHubLink } from './PhysiotherapyGuide';
import Link from 'next/link';
import {
  nursingFaq,
  nursingInstitutionBreakdown,
  nursingInstitutionCount,
  nursingInstitutions,
  nursingPisgaInstitutions,
  nursingRetrainingCount,
  nursingTrackLabels,
} from '@/data/nursingInstitutions';
import { absoluteUrl } from '@/lib/site';

const linkClass =
  'inline-flex min-h-11 min-w-11 items-center font-semibold text-[#6554b8] underline underline-offset-2';
const cellClass = 'sm:table-cell sm:border sm:border-slate-200 sm:px-3 sm:py-1.5 sm:align-middle';

export function NursingAnswer() {
  return (
    <p className="mt-4 max-w-3xl leading-7 text-slate-700">
      <strong className="text-slate-900">איפה לומדים סיעוד בישראל?</strong>{' '}
      {`ברשימת משרד הבריאות יש ${nursingInstitutionCount} מסגרות לתואר ראשון בסיעוד (`}
      <bdi dir="ltr">B.A.</bdi> או <bdi dir="ltr">BSN</bdi>
      {`): ${nursingInstitutionBreakdown}. ב-${nursingRetrainingCount} מהן יש גם מסלול הסבת אקדמאים, ו${nursingPisgaInstitutions} גם עתודה אקדמית (פסגה). תנאי הקבלה שונים בכל מוסד. בסיום התואר ניגשים לבחינת הרישוי הממשלתית.`}
    </p>
  );
}

export function NursingInstitutionsTable({
  programmePaths,
}: {
  programmePaths: ReadonlySet<string>;
}) {
  return (
    <section
      aria-labelledby="nursing-institutions"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <h2 id="nursing-institutions" className="text-xl font-bold">
        איפה לומדים סיעוד: כל המוסדות ברשימת משרד הבריאות
      </h2>
      <table
        aria-labelledby="nursing-institutions"
        className="mt-5 block w-full text-right text-sm leading-6 sm:table sm:table-fixed"
      >
        <thead className="hidden bg-slate-50 sm:table-header-group">
          <tr>
            <th scope="col" className="w-[25%] border border-slate-200 px-3 py-2 text-right">
              מוסד
            </th>
            <th scope="col" className="w-[50%] border border-slate-200 px-3 py-2 text-right">
              מסלולים ברשימת משרד הבריאות
            </th>
            <th scope="col" className="w-[25%] border border-slate-200 px-3 py-2 text-right">
              ב-MyWay
            </th>
          </tr>
        </thead>
        <tbody className="block space-y-3 sm:table-row-group sm:space-y-0">
          {nursingInstitutions.map((row) => {
            const programmePath = row.programId ? `/programs/${row.programId}` : null;
            const mywayHref = row.hubAnchor
              ? `#${row.hubAnchor}`
              : programmePath && programmePaths.has(programmePath)
                ? programmePath
                : null;
            return (
              <tr
                key={row.mohName}
                className="grid grid-cols-2 gap-x-3 rounded-xl border border-slate-200 px-4 py-3 sm:table-row sm:rounded-none sm:border-0 sm:p-0"
              >
                <th
                  scope="row"
                  className={`col-span-2 block text-right text-base sm:text-sm ${cellClass}`}
                >
                  {row.institution}
                </th>
                <td className={`col-span-2 block pt-1 text-slate-700 ${cellClass}`}>
                  {row.tracks.map((track) => nursingTrackLabels[track]).join(' · ')}
                </td>
                <td className={`${mywayHref ? 'block' : 'hidden'} ${cellClass}`}>
                  {row.hubAnchor ? (
                    <a href={`#${row.hubAnchor}`} className={linkClass}>
                      תנאי קבלה בעמוד הזה
                    </a>
                  ) : mywayHref ? (
                    <Link href={mywayHref} className={linkClass}>
                      עמוד המסלול
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        תנאי הקבלה המחייבים מופיעים באתר כל מוסד.
      </p>
    </section>
  );
}

export function NursingFaq() {
  return (
    <section id="faq" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold">שאלות נפוצות על לימודי סיעוד</h2>
      <dl className="mt-4 space-y-5">
        {nursingFaq.map(({ question, answer }) => (
          <div key={question}>
            <dt className="font-semibold">{question}</dt>
            <dd className="mt-1 leading-7 text-slate-700">{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function nursingFaqLd() {
  return {
    '@type': 'FAQPage',
    '@id': absoluteUrl('/programs/nursing#faq'),
    mainEntity: nursingFaq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function NursingRelatedLink({
  includePhysiotherapy = false,
}: {
  includePhysiotherapy?: boolean;
}) {
  return (
    <div className="text-sm text-slate-700">
      {'תחומים קרובים: '}
      <NursingHubLink>לימודי סיעוד: איפה לומדים ותנאי קבלה</NursingHubLink>
      {includePhysiotherapy && (
        <span className="ms-5 inline-block">
          <PhysiotherapyHubLink />
        </span>
      )}
    </div>
  );
}

export function NursingHubLink({ children }: { children: string }) {
  return (
    <Link href="/programs/nursing" className={linkClass}>
      {children}
    </Link>
  );
}
