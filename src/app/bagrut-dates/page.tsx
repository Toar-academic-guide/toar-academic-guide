import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import { bagrutExamCalendars, simulationOpenings, spokenLanguageExams } from '@/data/bagrutDates';
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

function fullDate(iso: string) {
  const [year, month, date] = iso.split('-');
  return `${Number(date)}.${Number(month)}.${year}`;
}

const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' });

function ExamDate({ date }: { date: string }) {
  return (
    <>
      <time dateTime={date} dir="ltr">
        {fullDate(date)}
      </time>
      <span className={styles.weekday}>{weekday.format(new Date(`${date}T12:00:00Z`))}</span>
    </>
  );
}

function DateList({ dates }: { dates: readonly string[] }) {
  return (
    <ul className={styles.dates}>
      {dates.map((date) => (
        <li key={date}>
          <ExamDate date={date} />
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
          <ul className={styles.examGroups}>
            {spokenLanguageExams.flatMap((exam) =>
              exam.sittings.map((sitting) => (
                <li className={styles.examCard} key={`${exam.language}-${sitting.label}`}>
                  <h3>{exam.language}</h3>
                  <p className={styles.sitting}>{sitting.label}</p>
                  <DateList dates={sitting.dates} />
                  {'time' in sitting && (
                    <p className={styles.examTime}>
                      <bdi dir="ltr">{sitting.time}</bdi>
                    </p>
                  )}
                </li>
              )),
            )}
          </ul>
        </details>

        <details className={styles.more}>
          <summary>פתיחת הדמיות</summary>
          <ul className={styles.examGroups}>
            {simulationOpenings.map((opening) => (
              <li className={styles.examCard} key={opening.label}>
                <h3>{opening.label}</h3>
                <DateList dates={[opening.date]} />
              </li>
            ))}
          </ul>
        </details>

        <p className={styles.prepLink}>
          <Link href="/enquiry?program=psychometric-preparation">הכנה לפסיכומטרי</Link>
        </p>
      </main>
    </WayPageShell>
  );
}
