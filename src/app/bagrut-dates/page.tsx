import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import {
  bagrutDatesCheckedOn,
  bagrutDatesSources,
  bagrutExamCalendars,
  simulationOpenings,
  spokenLanguageExams,
} from '@/data/bagrutDates';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const title = 'מועדי בחינות הבגרות 2026–2027 | MyWay';
const description =
  'מועדי בחינות הבגרות לחורף ולקיץ תשפ״ז, בחינות שפה דבורה ומועדי פתיחת הדמיות לפי לוחות משרד החינוך.';
const canonical = absoluteUrl('/bagrut-dates');

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
    type: 'website',
    locale: 'he_IL',
    siteName: SITE_NAME,
  },
  twitter: { card: 'summary', title, description },
};

function day(iso: string) {
  return iso.slice(8);
}

function fullDate(iso: string) {
  const [year, month, date] = iso.split('-');
  return `${Number(date)}.${Number(month)}.${year}`;
}

function DateList({ dates }: { dates: readonly string[] }) {
  return (
    <ul className={styles.dates}>
      {dates.map((date) => (
        <li key={date}>
          <time dateTime={date} dir="ltr">
            {day(date)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export default function BagrutDatesPage() {
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <header className={styles.header}>
          <h1>מועדי בחינות הבגרות תשפ״ז</h1>
          <p>
            נבדק בתאריך <bdi dir="ltr">{fullDate(bagrutDatesCheckedOn)}</bdi> ·{' '}
            <a href={bagrutDatesSources.portal}>לוח הבחינות באתר משרד החינוך</a>
          </p>
        </header>

        <div className={styles.calendars}>
          {bagrutExamCalendars.map((calendar) => (
            <section
              key={calendar.id}
              className={styles.calendar}
              aria-labelledby={`${calendar.id}-title`}
            >
              <div className={styles.calendarHeader}>
                <h2 id={`${calendar.id}-title`}>
                  מועד {calendar.label} <bdi dir="ltr">{calendar.year}</bdi>
                </h2>
                <span className={styles.status}>{calendar.status}</span>
              </div>
              <a className={styles.source} href={calendar.sourceUrl}>
                לוח הבחינות המלא
              </a>
              <div className={styles.months}>
                {calendar.months.map((month) => (
                  <section key={month.label} aria-label={month.label} className={styles.month}>
                    <h3>{month.label}</h3>
                    <DateList dates={month.dates} />
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>

        <details className={styles.more}>
          <summary>בחינות שפה דבורה</summary>
          <table>
            <caption className={styles.srOnly}>מועדי בחינות השפה הדבורה</caption>
            <thead>
              <tr>
                <th scope="col">מקצוע</th>
                <th scope="col">מועד</th>
                <th scope="col">תאריכים</th>
              </tr>
            </thead>
            <tbody>
              {spokenLanguageExams.flatMap((exam) =>
                exam.sittings.map((sitting) => (
                  <tr key={`${exam.language}-${sitting.label}`}>
                    <th scope="row">{exam.language}</th>
                    <td>{sitting.label}</td>
                    <td dir="ltr" className={styles.dateCell}>
                      {sitting.dates.map(fullDate).join(' · ')}
                      {'time' in sitting && ` · ${sitting.time}`}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          <a className={styles.source} href={bagrutDatesSources.spokenAndSimulations}>
            לוח מועדי השפה הדבורה באתר משרד החינוך
          </a>
        </details>

        <details className={styles.more}>
          <summary>פתיחת הדמיות</summary>
          <table>
            <caption className={styles.srOnly}>תאריכי פתיחת ההדמיות לפי משרד החינוך</caption>
            <thead>
              <tr>
                <th scope="col">מועד</th>
                <th scope="col">תאריך פתיחה</th>
              </tr>
            </thead>
            <tbody>
              {simulationOpenings.map((opening) => (
                <tr key={opening.label}>
                  <th scope="row">{opening.label}</th>
                  <td dir="ltr">{fullDate(opening.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <a className={styles.source} href={bagrutDatesSources.spokenAndSimulations}>
            לוח ההדמיות באתר משרד החינוך
          </a>
        </details>

        <p className={styles.prepLink}>
          <Link href="/enquiry?program=psychometric-preparation">הכנה לפסיכומטרי</Link>
        </p>
      </main>
    </WayPageShell>
  );
}
