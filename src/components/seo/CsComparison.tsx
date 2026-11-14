import Link from 'next/link';
import { csComparisonRows, csFaq } from '@/data/csComparison';
import { absoluteUrl } from '@/lib/site';

const linkClass =
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

export function csFaqLd() {
  return {
    '@type': 'FAQPage',
    '@id': absoluteUrl('/programs/cs#cs-faq'),
    mainEntity: csFaq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function CsComparison() {
  return (
    <section
      id="cs-thresholds"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-xl font-bold">ספי הקבלה למדעי המחשב לפי מוסד</h2>
      <p className="mt-3 leading-7 text-slate-700">
        כל מספר מופיע בסולם של המוסד עצמו, עם קישור לעמוד הרשמי ותאריך הבדיקה.
      </p>
      <table className="mt-5 block w-full text-right text-sm leading-6 sm:table sm:table-fixed">
        <caption className="sr-only">ספי קבלה למדעי המחשב לפי מוסד ומסלול קבלה</caption>
        <thead className="hidden bg-slate-50 sm:table-header-group">
          <tr>
            <th scope="col" className="w-[18%] border border-slate-200 p-2">
              מוסד
            </th>
            <th scope="col" className="w-[17%] border border-slate-200 p-2">
              מסלול קבלה
            </th>
            <th scope="col" className="w-[27%] border border-slate-200 p-2">
              הסף שפורסם
            </th>
            <th scope="col" className="w-[16%] border border-slate-200 p-2">
              סולם הציון
            </th>
            <th scope="col" className="w-[13%] border border-slate-200 p-2">
              מחזור
            </th>
            <th scope="col" className="w-[9%] border border-slate-200 p-2">
              מקור
            </th>
          </tr>
        </thead>
        <tbody className="block space-y-4 sm:table-row-group sm:space-y-0">
          {csComparisonRows.map((row, index) => (
            <tr
              key={`${row.programId}-${index}`}
              className="block rounded-xl border border-slate-200 p-4 sm:table-row sm:rounded-none sm:border-0 sm:p-0"
            >
              <th
                scope="row"
                className="block pb-3 text-base sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top sm:text-sm"
              >
                <Link href={`/programs/${row.programId}`} className={linkClass}>
                  {row.institution}
                </Link>
              </th>
              <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                  מסלול קבלה
                </span>
                {row.route}
              </td>
              <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                  הסף שפורסם
                </span>
                {row.numeric ? (
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-slate-700 underline decoration-[#b8b0d7] underline-offset-2 hover:text-[#6554b8]"
                  >
                    <span>
                      <BidiText text={row.value} />
                    </span>
                  </a>
                ) : (
                  row.value
                )}
                {row.note && (
                  <p className="mt-1 text-slate-600">
                    <BidiText text={row.note} />
                  </p>
                )}
              </td>
              <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                  סולם הציון
                </span>
                {row.scale}
              </td>
              <td className="block border-t border-slate-100 py-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                  מחזור
                </span>
                <BidiText text={row.cycle} />
              </td>
              <td className="block border-t border-slate-100 pt-3 sm:table-cell sm:border sm:border-slate-200 sm:p-2 sm:align-top">
                <span className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                  מקור
                </span>
                <a
                  href={row.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  אתר המוסד
                </a>
                <span className="block text-xs text-slate-500">
                  נבדק <bdi dir="ltr">{row.checkedDate}</bdi>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link
        href="/calculator"
        className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
      >
        בדקו מסלולים נתמכים במחשבון
      </Link>
    </section>
  );
}

export function CsFaq() {
  return (
    <section
      id="cs-faq"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-xl font-bold">שאלות נפוצות על קבלה למדעי המחשב</h2>
      <dl className="mt-4 space-y-5">
        {csFaq.map(({ question, answer }) => (
          <div key={question}>
            <dt className="font-semibold">
              {question === 'אפשר להתקבל למדעי המחשב בלי פסיכומטרי?' ? (
                <>
                  אפשר להתקבל למדעי המחשב{' '}
                  <Link href="/without-psychometric" className={linkClass}>
                    בלי פסיכומטרי
                  </Link>
                  ?
                </>
              ) : (
                <BidiText text={question} />
              )}
            </dt>
            <dd className="mt-1 leading-7 text-slate-700">
              <BidiText text={answer} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
