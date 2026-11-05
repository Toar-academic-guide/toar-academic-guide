import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import {
  psychometricDates,
  psychometricDatesCheckedOn,
  psychometricFacts,
} from '@/data/psychometricDates';
import { formatPsychometricDate, getSittingStatuses } from '@/lib/psychometricDates';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const title = 'מועדי פסיכומטרי 2026–2027: תאריכים וסיום הרשמה | MyWay';
const description =
  'מועדי הבחינה הפסיכומטרית לפי לוח מאל״ו: תאריכי בחינה, מועדי סיום הרשמה ושפות לכל מועד, עם תאריך בדיקה וקישור למקור הרשמי.';
const canonical = absoluteUrl('/psychometric-dates');

export const dynamic = 'force-dynamic';
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

function ReformNote() {
  const year = psychometricFacts.reform.from.split('-')[0];
  const forecast = psychometricDates.find((sitting) => sitting.scoresForecast)?.scoresForecast;
  return (
    <>
      מדצמבר <bdi dir="ltr">{year}</bdi> הבחינה דו־תחומית:{' '}
      {psychometricFacts.reform.domains.join(' ו')}. תחזית הציונים למועד דצמבר{' '}
      <bdi dir="ltr">{year}</bdi>:{' '}
      <bdi dir="ltr">{forecast && formatPsychometricDate(forecast)}</bdi> (
      <a href={psychometricFacts.reform.sourceUrl}>מאל״ו</a>).
    </>
  );
}

export default async function Page() {
  const statuses = getSittingStatuses(psychometricDates, new Date());
  const next = statuses.find(({ isNextOpen }) => isNextOpen)?.sitting;
  const checkedDate = formatPsychometricDate(psychometricDatesCheckedOn);
  const years = `${psychometricDates[0].testDays[0].slice(0, 4)}–${psychometricDates.at(-1)!.testDays[0].slice(0, 4)}`;
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <div className={styles.intro}>
          <h1>
            מועדי פסיכומטרי <bdi dir="ltr">{years}</bdi>
          </h1>
          {next && (
            <p className={styles.answer}>
              המועד הפתוח הקרוב להרשמה: <bdi dir="ltr">{next.displayLabel}</bdi>. ההרשמה נסגרת ב־
              <bdi dir="ltr">{formatPsychometricDate(next.registrationDeadline)}</bdi>.
            </p>
          )}
          <p className={styles.stamp}>
            נבדק בתאריך <bdi dir="ltr">{checkedDate}</bdi> ·{' '}
            <a href={psychometricFacts.ordinaryRegistration.sourceUrl}>
              לוח הבחינות הרשמי באתר מאל״ו
            </a>
          </p>
        </div>
        <section className={styles.tool} aria-label="מועדי הבחינה הקרובים">
          <table>
            <caption className={styles.srOnly}>
              מועדי פסיכומטרי מ־<bdi dir="ltr">{checkedDate}</bdi> ואילך
            </caption>
            <thead>
              <tr>
                <th scope="col">מועד הבחינה</th>
                <th scope="col">סיום הרשמה</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map(({ sitting, registrationOpen, isNextOpen }) => (
                <tr key={sitting.id} className={isNextOpen ? styles.next : undefined}>
                  <th scope="row">
                    <a
                      href={sitting.sourceUrl}
                      aria-label={`מועד ${sitting.displayLabel} — מקור מאל״ו`}
                    >
                      <bdi dir="ltr">{sitting.displayLabel}</bdi>
                    </a>
                    {isNextOpen && <small>המועד הקרוב</small>}
                  </th>
                  <td>
                    <bdi dir="ltr">{formatPsychometricDate(sitting.registrationDeadline)}</bdi>
                    {!registrationOpen && (
                      <small className={styles.statusBadge}>ההרשמה נסגרה</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.ctaArea}>
            <Link className={styles.primary} href="/sekhem-calculator" prefetch={false}>
              יש לכם ציון? בדקו לאן אתם מתקבלים
              <svg
                data-icon="iconoir-arrow-left"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5m0 0 6 6m-6-6 6-6" />
              </svg>
            </Link>
          </div>
        </section>
        <p className={styles.reformNote}>
          <ReformNote />
        </p>
        <details className={styles.extra}>
          <summary>שפות הבחינה, מחיר ומידע נוסף</summary>
          <div className={styles.detailsContent}>
            <h2>שפות לפי מועד</h2>
            <ul>
              {statuses.map(({ sitting }) => (
                <li key={sitting.id}>
                  <bdi dir="ltr">{sitting.displayLabel}</bdi>: {sitting.languages.join(', ')}.
                </li>
              ))}
            </ul>
            <p>
              <ReformNote /> מחיר הרשמה רגילה המוצג באתר מאל״ו:{' '}
              <bdi dir="ltr">{psychometricFacts.ordinaryRegistration.price} ₪</bdi>.
            </p>
            <p>
              תאריכי <bdi dir="ltr">2027</bdi> ושפות הבחינה מופיעים גם ב
              <a href={psychometricDates[1].sourceUrl}>
                לוח הבחינות הרשמי לשנת <bdi dir="ltr">2027</bdi>
              </a>
              .
            </p>
            <Link href="/institutions" prefetch={false}>
              מוסדות לימוד
            </Link>
          </div>
        </details>
      </main>
    </WayPageShell>
  );
}
