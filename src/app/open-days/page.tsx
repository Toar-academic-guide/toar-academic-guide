import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { getJerusalemDate } from '@/lib/psychometricDates';
import { shareCards, socialMetadata } from '@/lib/seo/shareCards';
import { loadOpenDays, type OpenDay } from './openDays';
import {
  calendarFaq,
  dateText,
  eventSchema,
  timeText,
  unannouncedInstitutions,
} from './calendarContent';
import styles from './page.module.css';

const title = 'ימים פתוחים 2027 באוניברסיטאות ובמכללות';
const description =
  'כל הימים הפתוחים לתואר ראשון 2027 במקום אחד: אוניברסיטאות ומכללות, תאריכים, קמפוס או זום — ובדיקת סיכויי קבלה לפני שמגיעים.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/open-days' },
  ...socialMetadata(shareCards.openDays, title, description, '/open-days'),
};

function DateCopy({ text }: { text: string }) {
  return text.split(/(\d+(?::\d+)?[–-]\d+(?::\d+)?)/g).map((part, index) =>
    index % 2 ? (
      <bdi key={index} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

const filters = [
  { value: 'all', label: 'הכול', href: '/open-days' },
  { value: 'universities', label: 'אוניברסיטאות', href: '/open-days?type=universities' },
  { value: 'colleges', label: 'מכללות', href: '/open-days?type=colleges' },
] as const;

function EventDate({ event }: { event: OpenDay }) {
  const description = [
    event.title !== 'יום פתוח' && event.title,
    event.faculty && !event.title.includes(event.faculty) && event.faculty,
    event.place,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.event}>
      <div>
        <span>
          <DateCopy text={dateText(event)} />
        </span>
        {timeText(event) && (
          <span className={styles.time}>
            {' '}
            · <bdi dir="ltr">{timeText(event)}</bdi>
          </span>
        )}
        {description && <small>{description}</small>}
      </div>
    </div>
  );
}

export default async function OpenDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const type = (await searchParams).type;
  const filter = filters.find((option) => option.value === type) ?? filters[0];
  const today = getJerusalemDate(new Date());
  const allEvents = (await loadOpenDays())
    .filter((event) => (event.endDate || event.date) >= today)
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.institution.localeCompare(b.institution, 'he'),
    );
  const events = allEvents.filter(
    (event) => filter.value === 'all' || event.university === (filter.value === 'universities'),
  );
  const pending = unannouncedInstitutions.filter(
    (row) =>
      (filter.value === 'all' || row.university === (filter.value === 'universities')) &&
      !allEvents.some((event) => event.institution === row.name),
  );
  const faq = calendarFaq(allEvents);
  const institutions = Map.groupBy(events, (event) => event.institution);
  return (
    <WayPageShell>
      <main dir="rtl" id="main-content" className={styles.main}>
        <JsonLd
          data={[
            ...events.map(eventSchema).filter((event) => event !== null),
            {
              '@type': 'FAQPage',
              mainEntity: faq.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
          ]}
        />
        <h1>{title}</h1>
        <section className={styles.answer} aria-labelledby="open-days-answer">
          <h2 id="open-days-answer">מתי הימים הפתוחים 2027?</h2>
          <p>
            <DateCopy text={faq[0].answer} />
          </p>
          <p>
            בדקו לפני היום הפתוח מה הסיכויים שלכם להתקבל:{' '}
            <Link href="/calculator">בדקו את סיכויי הקבלה שלכם</Link>
          </p>
        </section>
        <nav aria-label="סוג מוסד" className={styles.filters}>
          {filters.map((option) => (
            <Link
              key={option.value}
              scroll={false}
              href={option.href}
              aria-current={option === filter ? 'page' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        {institutions.size === 0 && pending.length === 0 ? (
          <p>כרגע אין מועדים קרובים להצגה.</p>
        ) : (
          <table className={styles.table}>
            <caption className="sr-only">ימים פתוחים קרובים</caption>
            <thead>
              <tr>
                <th scope="col">מוסד</th>
                <th scope="col">תאריך</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(institutions, ([institution, [first, ...later]]) => (
                <tr key={institution}>
                  <th scope="row">{institution}</th>
                  <td>
                    <EventDate event={first} />
                    {later.length > 0 && (
                      <details className={styles.later}>
                        <summary>
                          {later.length === 1 ? 'מועד נוסף' : `עוד ${later.length} מועדים`}
                        </summary>
                        {later.map((event) => (
                          <EventDate key={event.id} event={event} />
                        ))}
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {pending.map(({ name }) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>טרם פורסם</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <section className={styles.faq} aria-labelledby="open-days-faq">
          <h2 id="open-days-faq">שאלות נפוצות</h2>
          {faq.map(({ question, answer, link }) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>
                {link ? (
                  <>
                    <DateCopy text={answer.slice(0, answer.lastIndexOf(link.text))} />
                    <Link href={link.href}>{link.text}</Link>
                    {answer.slice(answer.lastIndexOf(link.text) + link.text.length)}
                  </>
                ) : (
                  <DateCopy text={answer} />
                )}
              </p>
            </details>
          ))}
        </section>
      </main>
    </WayPageShell>
  );
}
