import Link from 'next/link';
import { Fragment } from 'react';
import { dentistryFaq, dentistryRows } from '@/data/degrees/dentistry';
import { INSTITUTION_BY_ID } from '@/data/institutions';
import JsonLd from '@/components/seo/JsonLd';

const linkClass =
  'inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2';
const cellClass = 'block py-2 sm:table-cell sm:border sm:border-slate-200 sm:p-4 sm:align-top';

function NumericCopy({ text }: { text: string }) {
  return text.split(/(\d+(?:[.–]\d+)*(?:%)?)/g).map((part, index) =>
    /^\d/.test(part) ? (
      <bdi key={index} dir="ltr" className="whitespace-nowrap">
        {part}
      </bdi>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function DentistryMedicineLink() {
  return (
    <Link href="/programs/dentistry" className={linkClass}>
      מחפשים רפואת שיניים? למסלולי{' '}
      <bdi dir="ltr" className="ms-1">
        D.M.D.
      </bdi>
    </Link>
  );
}

export function DentistryGuide() {
  return (
    <main
      dir="rtl"
      data-page-kind="subject"
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 text-right text-slate-900 sm:px-6"
    >
      <JsonLd
        data={{
          '@type': 'FAQPage',
          mainEntity: dentistryFaq.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }}
      />
      <header>
        <Link href="/programs" className={linkClass}>
          לכל תחומי הלימוד
        </Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          לימודי רפואת שיניים — תנאי קבלה ושלבי מיון
        </h1>
        <p className="mt-4 max-w-3xl leading-7">
          רפואת שיניים לומדים באוניברסיטה העברית בירושלים ובאוניברסיטת תל אביב, לתואר{' '}
          <bdi dir="ltr">D.M.D.</bdi>. הקבלה משלבת תנאי סף, מבחנים וראיונות. עמידה בסף הפסיכומטרי
          אינה מבטיחה קבלה.
        </p>
      </header>
      <section aria-labelledby="dentistry-stages">
        <h2 id="dentistry-stages" className="text-xl font-bold">
          תנאי הקבלה ושלבי המיון בתשפ״ז
        </h2>
        <p className="mt-2 leading-7">
          מועדי המיון לתשפ״ח: טרם פורסם. התאריכים להלן מתייחסים לתשפ״ז בלבד.
        </p>
        <table
          aria-labelledby="dentistry-stages"
          className="mt-5 block w-full text-right text-sm leading-6 sm:table sm:table-fixed"
        >
          <thead className="hidden bg-slate-50 sm:table-header-group">
            <tr>
              {['מוסד', 'תנאי סף', 'שלבי המיון והקבלה', 'מועדים'].map((title, i) => (
                <th
                  key={title}
                  scope="col"
                  className={`border border-slate-200 p-3 text-right ${i === 0 ? 'w-[18%]' : i === 2 ? 'w-[34%]' : 'w-[24%]'}`}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block space-y-5 sm:table-row-group sm:space-y-0">
            {dentistryRows.map((row) => (
              <tr
                key={row.programId}
                className="block rounded-2xl border border-slate-200 bg-white p-4 sm:table-row sm:rounded-none sm:border-0 sm:p-0"
              >
                <th scope="row" className={`${cellClass} text-right text-base`}>
                  <Link href={`/programs/${row.programId}`} className={linkClass}>
                    {INSTITUTION_BY_ID[row.institutionId].name}
                  </Link>
                </th>
                <td className={cellClass}>
                  <strong className="mb-1 block sm:hidden">תנאי סף</strong>
                  <NumericCopy text={row.prerequisites} />
                </td>
                <td className={cellClass}>
                  <strong className="mb-1 block sm:hidden">שלבי המיון והקבלה</strong>
                  <NumericCopy text={row.stages} />
                </td>
                <td className={cellClass}>
                  <strong className="block">תשפ״ז</strong>
                  <NumericCopy text={row.previousDates} />
                  <strong className="mt-3 block">תשפ״ח</strong>טרם פורסם
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section
        aria-labelledby="dentistry-faq"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
      >
        <h2 id="dentistry-faq" className="text-xl font-bold">
          שאלות נפוצות על רפואת שיניים
        </h2>
        <dl className="mt-4 space-y-5">
          {dentistryFaq.map(({ question, answer }) => (
            <div key={question}>
              <dt className="font-semibold">{question}</dt>
              <dd className="mt-1 leading-7">
                <NumericCopy text={answer} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <Link href="/programs/medicine" className={linkClass}>
        למסלולי רפואה —{' '}
        <bdi dir="ltr" className="ms-1">
          M.D.
        </bdi>
      </Link>
    </main>
  );
}
