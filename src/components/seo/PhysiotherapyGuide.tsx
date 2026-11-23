import Link from 'next/link';
import JsonLd from './JsonLd';
import { absoluteUrl } from '@/lib/site';
import {
  physiotherapyAnswer,
  physiotherapyFaq,
  physiotherapyRows,
} from '@/data/physiotherapyComparison';
import styles from './PhysiotherapyGuide.module.css';

const linkClass =
  'inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2';
export function PhysiotherapyText({ text }: { text: string }) {
  return text.split(/(\d+(?:[.–−-]\d+)*|[A-Za-z]+(?:\.[A-Za-z]+)*\.?)/g).map((part, index) =>
    /^[\dA-Za-z]/.test(part) ? (
      <bdi key={index} dir="ltr" className="whitespace-nowrap">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}
export function PhysiotherapyAnswer() {
  return (
    <>
      <JsonLd
        data={{
          '@type': 'FAQPage',
          '@id': absoluteUrl('/programs/physiotherapy#faq'),
          mainEntity: physiotherapyFaq.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }}
      />
      <p className="mt-4 max-w-4xl leading-7 text-slate-700">
        <strong>איפה לומדים פיזיותרפיה בישראל?</strong>{' '}
        <PhysiotherapyText text={physiotherapyAnswer} />
      </p>
    </>
  );
}
export function PhysiotherapyTable() {
  return (
    <section
      aria-labelledby="physiotherapy-admissions"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
    >
      <h2 id="physiotherapy-admissions" className="text-2xl font-bold">
        תנאי קבלה לפיזיותרפיה: כל המוסדות בטבלה אחת
      </h2>
      <p className="my-4 leading-7 text-slate-700">
        הסף כפי שהמוסד מפרסם אותו, בסולם של המוסד. סכם של מוסד אחד אינו בר השוואה לסכם של מוסד אחר.
      </p>
      <table className={styles.table} aria-labelledby="physiotherapy-admissions">
        <thead>
          <tr>
            {['מוסד', 'מסלול', 'הסף הרשמי', 'ריאיון'].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {physiotherapyRows.map((row) => (
            <tr key={row.id} data-physiotherapy-route={row.id}>
              <th scope="row">
                {'programId' in row ? (
                  <Link href={`/programs/${row.programId}`} className={linkClass}>
                    {row.institution}
                  </Link>
                ) : (
                  row.institution
                )}
              </th>
              {(['route', 'threshold', 'interview'] as const).map((key, i) => (
                <td key={key}>
                  <span className={styles.mobileLabel}>{['מסלול', 'הסף הרשמי', 'ריאיון'][i]}</span>
                  <span data-physiotherapy-cell={key}>
                    <PhysiotherapyText text={row[key]} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
export function PhysiotherapyFaq() {
  return (
    <section id="faq" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <h2 className="text-2xl font-bold">שאלות נפוצות על לימודי פיזיותרפיה</h2>
      <dl className="mt-5 space-y-5">
        {physiotherapyFaq.map(({ question, answer }) => (
          <div key={question}>
            <dt className="font-semibold">{question}</dt>
            <dd className="mt-2 leading-7 text-slate-700">
              <PhysiotherapyText text={answer} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function PhysiotherapyHubLink({ child = false }: { child?: boolean }) {
  return (
    <Link href="/programs/physiotherapy" className={linkClass}>
      {child ? 'כל המוסדות ללימודי פיזיותרפיה' : 'לימודי פיזיותרפיה: איפה לומדים ותנאי קבלה'}
    </Link>
  );
}
