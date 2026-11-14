import Link from 'next/link';
import {
  psychologyComparisonRows,
  psychologyFaq,
  type PsychologySourceText,
} from '@/data/psychologyComparison';

const sourceLinkClass =
  'inline-flex min-h-11 items-center text-slate-700 underline decoration-[#b8b0d7] underline-offset-2 hover:text-[#6554b8]';
const primaryLinkClass =
  'inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2';

function BidiText({ text }: { text: string }) {
  return text.split(/(\d+(?:[.,]\d+)*(?:[–-]\d+(?:[.,]\d+)*)?)/g).map((part, index) =>
    /^\d/.test(part) ? (
      <bdi key={index} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

function SourceText({ text, url }: PsychologySourceText) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={sourceLinkClass}>
      <span>
        <BidiText text={text} />
      </span>
    </a>
  );
}

export function psychologyFaqLd() {
  return {
    '@type': 'FAQPage',
    mainEntity: psychologyFaq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function PsychologyComparison() {
  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">השוואת תנאי קבלה לפסיכולוגיה</h2>
        <p className="mt-3 leading-7 text-slate-700">
          כל מוסד מחשב תנאי קבלה בסולם משלו — ציון התאמה, סכם או ממוצע בגרות — ולכן צריך לקרוא את
          המספר יחד עם סוג הציון. בטבלה מופיעים המסלול הראשי, מסלול בגרות בלבד אם פורסם, המקור
          ותאריך הבדיקה. תואר ראשון בפסיכולוגיה אינו רישיון; תואר שני הוא שלב נפרד. באונו התואר הוא
          במדעי ההתנהגות.
        </p>
        <table
          aria-label="תנאי קבלה לתואר ראשון לפי מוסד"
          className="mt-6 block w-full text-right text-sm leading-6 sm:table sm:table-fixed"
        >
          <thead className="hidden bg-slate-50 sm:table-header-group">
            <tr>
              <th scope="col" className="w-[17%] border border-slate-200 p-2">
                מוסד
              </th>
              <th scope="col" className="w-[25%] border border-slate-200 p-2">
                מסלול קבלה
              </th>
              <th scope="col" className="w-[24%] border border-slate-200 p-2">
                בגרות בלבד
              </th>
              <th scope="col" className="w-[17%] border border-slate-200 p-2">
                סולם הציון
              </th>
              <th scope="col" className="w-[9%] border border-slate-200 p-2">
                מקור
              </th>
              <th scope="col" className="w-[8%] border border-slate-200 p-2">
                נבדק
              </th>
            </tr>
          </thead>
          <tbody className="block space-y-4 sm:table-row-group sm:space-y-0">
            {psychologyComparisonRows.map((row) => (
              <tr
                key={row.programId}
                className="block rounded-xl border border-slate-200 p-4 sm:table-row sm:rounded-none sm:border-0 sm:p-0"
              >
                <th
                  scope="row"
                  className="block pb-3 text-base font-semibold sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top sm:text-sm"
                >
                  <Link href={`/programs/${row.programId}`} className={primaryLinkClass}>
                    {row.institution}
                  </Link>
                </th>
                <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                    מסלול קבלה
                  </span>
                  <div className="space-y-2">
                    {row.main.map((item) => (
                      <p key={item.text}>
                        <SourceText {...item} />
                      </p>
                    ))}
                    {row.note && (
                      <p
                        className={
                          row.programId === 'ariel_psychology'
                            ? 'rounded-lg bg-amber-50 px-2 text-amber-950'
                            : 'text-slate-600'
                        }
                      >
                        {row.programId === 'ariel_psychology' ? (
                          <BidiText text={row.note} />
                        ) : (
                          <SourceText text={row.note} url={row.officialUrl} />
                        )}
                      </p>
                    )}
                  </div>
                </td>
                <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                    בגרות בלבד
                  </span>
                  {row.bagrut.length
                    ? row.bagrut.map((item) => (
                        <p key={item.text}>
                          <SourceText {...item} />
                        </p>
                      ))
                    : '—'}
                </td>
                <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                    סולם הציון
                  </span>
                  {row.scale}
                </td>
                <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                    מקור
                  </span>
                  <a
                    href={row.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={primaryLinkClass}
                  >
                    לאתר המוסד
                  </a>
                </td>
                <td className="block border-t border-slate-100 pt-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                    נבדק
                  </span>
                  <bdi dir="ltr">{row.checkedDate}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">תואר ראשון בפסיכולוגיה לא מסמיך לעסוק בפסיכולוגיה</h2>
        <p className="mt-3 leading-7 text-slate-700">
          לפי משרד הבריאות, לרישום בפנקס הפסיכולוגים נדרש תואר שני בפסיכולוגיה ואישור לרישום. מומחים
          ומתמחים מאושרים רשאים לאבחן ולטפל בהתאם לתחום מומחיותם. קבלה לתואר שני בפסיכולוגיה קלינית
          היא שלב נפרד, ותנאי הקבלה אליה משתנים בין התוכניות.
        </p>
        <a
          href="https://me.health.gov.il/mental-health/information-and-updates/mental-health-care/who-can-offer-therapy/"
          target="_blank"
          rel="noopener noreferrer"
          className={primaryLinkClass}
        >
          על מקצוע הפסיכולוגיה — משרד הבריאות
        </a>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">שאלות נפוצות</h2>
        <dl className="mt-4 space-y-5">
          {psychologyFaq.map(({ question, answer }) => (
            <div key={question}>
              <dt className="font-semibold">{question}</dt>
              <dd className="mt-1 leading-7 text-slate-700">
                <BidiText text={answer} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
