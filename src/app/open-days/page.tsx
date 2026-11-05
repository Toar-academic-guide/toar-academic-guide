import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import { getJerusalemDate } from '@/lib/psychometricDates';
import { loadOpenDays } from './openDays';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'ימים פתוחים באוניברסיטאות ובמכללות',
  description:
    'השוו תאריכים של ימים פתוחים באוניברסיטאות ובמכללות, מצאו את הקמפוס והירשמו באתר המוסד.',
  alternates: { canonical: '/open-days' },
};

const dateFormat = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
function dateLabel(start: string, end: string) {
  const first = new Date(start + 'T12:00:00Z');
  return end
    ? dateFormat.formatRange(first, new Date(end + 'T12:00:00Z'))
    : dateFormat.format(first);
}

export default async function OpenDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const descending = (await searchParams).sort === 'latest';
  const today = getJerusalemDate(new Date());
  const events = (await loadOpenDays())
    .filter((e) => (e.endDate || e.date) >= today)
    .sort(
      (a, b) =>
        (descending ? -1 : 1) * a.date.localeCompare(b.date) ||
        a.title.localeCompare(b.title, 'he'),
    );

  return (
    <WayPageShell>
      <main dir="rtl" id="main-content" className={styles.main}>
        <h1>ימים פתוחים באוניברסיטאות ובמכללות</h1>
        {events.length === 0 ? (
          <p>כרגע אין ימים פתוחים עם תאריך שפורסם.</p>
        ) : (
          <table className={styles.table}>
            <caption className="sr-only">ימים פתוחים קרובים</caption>
            <thead>
              <tr>
                <th scope="col">מוסד ואירוע</th>
                <th scope="col" aria-sort={descending ? 'descending' : 'ascending'}>
                  <Link
                    scroll={false}
                    href={descending ? '/open-days' : '/open-days?sort=latest'}
                    aria-label={descending ? 'הצגת התאריך הקרוב תחילה' : 'הצגת התאריך הרחוק תחילה'}
                  >
                    תאריך <span aria-hidden="true">{descending ? '↓' : '↑'}</span>
                  </Link>
                </th>
                <th scope="col">באתר המוסד</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <th scope="row">
                    <strong>{event.institution}</strong>
                    {event.title !== 'יום פתוח' && <span>{event.title}</span>}
                    {event.faculty && !event.title.includes(event.faculty) && (
                      <span>{event.faculty}</span>
                    )}
                    {event.place && <span>{event.place}</span>}
                  </th>
                  <td>{dateLabel(event.date, event.endDate)}</td>
                  <td>
                    <a href={event.registration || event.source}>
                      {event.registration ? 'להרשמה' : 'לפרטים'}
                    </a>
                    <small>
                      נבדק לאחרונה <bdi>{event.checked.split('-').reverse().join('.')}</bdi>
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </WayPageShell>
  );
}
