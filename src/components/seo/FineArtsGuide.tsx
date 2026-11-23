import Link from 'next/link';
import guide from '@/data/fineArtsGuide.json';
import JsonLd from '@/components/seo/JsonLd';
import { absoluteUrl } from '@/lib/site';
import styles from './FineArtsGuide.module.css';

const linkClass =
  'inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2';
const links = [
  { id: 'fine_arts', label: 'לימודי אמנות: איפה לומדים תואר באמנות ותנאי קבלה' },
  { id: 'art_teaching', label: 'לימודי אמנות והוראת אמנות (B.Ed.F.A.)' },
  { id: 'art_education', label: 'לימודי חינוך לאמנות' },
];

export function FineArtsText({ text }: { text: string }) {
  return text
    .split(/(\d+(?:[.–−-]\d+)*|[A-Za-z]+(?:\.[A-Za-z]+)*\.?(?: [A-Za-z]+(?:\.[A-Za-z]+)*\.?)*)/g)
    .map((part, index) =>
      /^[\dA-Za-z]/.test(part) ? (
        <bdi key={index} dir="ltr" className={/^\d/.test(part) ? 'whitespace-nowrap' : undefined}>
          {part}
        </bdi>
      ) : (
        part
      ),
    );
}

export function ArtHubLinks({ current }: { current: string }) {
  if (!links.some(({ id }) => id === current)) return null;
  return (
    <div className="my-6 text-sm text-slate-700">
      {current === 'fine_arts' ? 'תחומים קרובים: ' : 'מחפשים תואר באמנות ולא הוראת אמנות? '}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {links
          .filter(({ id }) => id !== current)
          .map(({ id, label }) => (
            <Link key={id} href={`/programs/${id}`} className={linkClass}>
              <FineArtsText text={label} />
            </Link>
          ))}
      </div>
    </div>
  );
}

export function FineArtsHubLink() {
  return (
    <Link href="/programs/fine_arts" className={`${linkClass} mt-4`}>
      כל המוסדות ללימודי אמנות
    </Link>
  );
}

export function FineArtsIntroduction() {
  return (
    <>
      <JsonLd
        data={{
          '@type': 'FAQPage',
          '@id': absoluteUrl('/programs/fine_arts#faq'),
          mainEntity: guide.faq.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }}
      />
      <p className="mb-8 max-w-4xl leading-7 text-slate-700">
        <strong>{guide.question}</strong> {guide.answer}
      </p>
      <section aria-labelledby="fine-arts-admissions" className="mb-8">
        <h2 id="fine-arts-admissions" className="text-2xl font-bold">
          {guide.tableTitle}
        </h2>
        <p className="mt-3 leading-7 text-slate-700">{guide.caption}</p>
        {(
          [
            { id: 'art', name: 'תואר באמנות' },
            { id: 'teaching', name: 'תואר באמנות עם תעודת הוראה' },
          ] as const
        ).map((group) => (
          <section key={group.id} className="mt-7" aria-labelledby={`arts-${group.id}`}>
            <h3 id={`arts-${group.id}`} className="mb-3 text-xl font-semibold">
              {group.name}
            </h3>
            <table className={styles.table} aria-labelledby={`arts-${group.id}`}>
              <thead>
                <tr>
                  {['מוסד', 'תואר', 'מסלולי קבלה', 'תיק עבודות וראיון', 'מועד הרשמה'].map(
                    (label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {guide.rows
                  .filter((row) => row.group === group.id)
                  .map((row) => (
                    <tr key={row.id} data-art-institution={row.id}>
                      <th scope="row">
                        {row.programPath ? (
                          <Link href={row.programPath} className={linkClass}>
                            {row.institution}
                          </Link>
                        ) : (
                          row.institution
                        )}
                      </th>
                      {(['programme', 'routes', 'exam', 'deadline'] as const).map((key, index) => (
                        <td key={key}>
                          <span className={styles.mobileLabel}>
                            {['תואר', 'מסלולי קבלה', 'תיק עבודות וראיון', 'מועד הרשמה'][index]}
                          </span>
                          <span data-art-cell={key}>
                            <FineArtsText text={row[key]} />
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
      </section>
    </>
  );
}

export function FineArtsFaq() {
  return (
    <>
      <Link
        href="/app/calculator"
        className="way-button-primary my-7 inline-flex min-h-11 items-center px-5 py-3"
      >
        בדקו את הסיכויים שלכם
      </Link>
      <ArtHubLinks current="fine_arts" />
      <section id="faq" className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-2xl font-bold">שאלות נפוצות על לימודי אמנות</h2>
        <dl className="mt-5 space-y-5">
          {guide.faq.map(({ question, answer }) => (
            <div key={question}>
              <dt className="font-semibold">{question}</dt>
              <dd className="mt-2 leading-7 text-slate-700">
                <FineArtsText text={answer} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
