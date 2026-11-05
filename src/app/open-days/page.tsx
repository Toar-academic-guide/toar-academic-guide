import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import { getJerusalemDate } from '@/lib/psychometricDates';
import { loadOpenDays, type OpenDay } from './openDays';
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

const filters = [
  { value: 'universities', label: 'אוניברסיטאות', href: '/open-days' },
  { value: 'colleges', label: 'מכללות', href: '/open-days?type=colleges' },
  { value: 'all', label: 'הכול', href: '/open-days?type=all' },
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
        <span>{dateLabel(event.date, event.endDate)}</span>
        {description && <small>{description}</small>}
      </div>
      <a href={event.registration || event.source}>{event.registration ? 'להרשמה' : 'לפרטים'}</a>
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
  const events = (await loadOpenDays())
    .filter((event) => (event.endDate || event.date) >= today)
    .filter(
      (event) => filter.value === 'all' || event.university === (filter.value === 'universities'),
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.institution.localeCompare(b.institution, 'he'),
    );
  const institutions = Map.groupBy(events, (event) => event.institution);
  return (
    <WayPageShell>
      <main dir="rtl" id="main-content" className={styles.main}>
        <h1>ימים פתוחים באוניברסיטאות ובמכללות</h1>
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
        {institutions.size === 0 ? (
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
            </tbody>
          </table>
        )}
      </main>
    </WayPageShell>
  );
}
