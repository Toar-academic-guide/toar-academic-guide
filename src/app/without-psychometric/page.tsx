import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import {
  withoutPsychometricRoutes,
  WITHOUT_PSYCHOMETRIC_CHECKED_ON,
} from '@/data/withoutPsychometricRoutes';
import { allowsNoPsychometric } from '@/lib/calculatorInputRequirements';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import {
  canLinkToSekhemCalculator,
  loadSekhemCalculatorOfferings,
} from '@/lib/sekhemCalculatorSupport';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const title = 'לימודים בלי פסיכומטרי: מסלולים לפי ממוצע בגרות | MyWay';
const description =
  'תוכניות לימוד עם מסלול קבלה לפי בגרות ללא פסיכומטרי. תנאים, מקורות רשמיים ומועד בדיקה לכל מסלול.';
const canonical = absoluteUrl('/without-psychometric');

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

export default async function WithoutPsychometricPage() {
  const [catalogue, offerings] = await Promise.all([
    loadPublicCatalogue(),
    loadSekhemCalculatorOfferings(),
  ]);
  const programsById = new Map(catalogue.programs.map((program) => [program.id, program]));
  const rows = withoutPsychometricRoutes.filter((route) => {
    if (!route.programId) return true; // Verified official identity has no matching MyWay page.
    const program = programsById.get(route.programId);
    return (
      !!program &&
      program.isListed !== false &&
      program.linkedInstitutionIds.includes(route.institutionId)
    );
  });

  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <article>
          <header className={styles.header}>
            <p className={styles.eyebrow}>תנאי קבלה</p>
            <h1>לימודים בלי פסיכומטרי</h1>
            <p className={styles.lead}>
              אפשר להתחיל תואר בלי פסיכומטרי במסלולים שמסתמכים על ציוני הבגרות. בטבלה מופיעים ממוצעי
              הבגרות שפרסמו המוסדות, מה עוד צריך להשלים וקישור לתנאים הרשמיים. בדקו גם את שנת
              הלימודים ומצב ההרשמה של התוכנית שמעניינת אתכם.
            </p>
          </header>

          <section aria-labelledby="routes-heading">
            <h2 id="routes-heading">מסלולים לפי ממוצע בגרות</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">ממוצע בגרות</th>
                  <th scope="col">תוכנית ותנאים</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((route, index) => {
                  const program = route.programId ? programsById.get(route.programId) : undefined;
                  const programHref = program
                    ? `/programs/${encodeURIComponent(program.id)}`
                    : undefined;
                  const calculator =
                    !!program &&
                    route.calculatorEligible === true &&
                    !route.status?.includes('ההרשמה סגורה') &&
                    allowsNoPsychometric(program.id) &&
                    canLinkToSekhemCalculator(program, route.institutionId, offerings);
                  return (
                    <tr key={`${route.institutionId}:${route.programme}:${index}`}>
                      <td className={styles.average}>{route.averageLabel ?? '—'}</td>
                      <td>
                        <h3>{route.programme}</h3>
                        <p className={styles.institution}>{route.institution}</p>
                        <p>{route.conditions}</p>
                        {route.status && <p className={styles.status}>{route.status}</p>}
                        <div className={styles.links}>
                          <a href={route.source}>תנאי הקבלה באתר המוסד</a>
                          {programHref && <Link href={programHref}>עמוד התוכנית</Link>}
                          {calculator && (
                            <Link
                              href={`/sekhem-calculator?program=${encodeURIComponent(program.id)}`}
                            >
                              בדקו במחשבון
                            </Link>
                          )}
                        </div>
                        <p className={styles.checked}>
                          נבדק <time dateTime={WITHOUT_PSYCHOMETRIC_CHECKED_ON}>10.11.2026</time>
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <nav aria-label="דרכים נוספות ללימודים" className={styles.more}>
            <h2>עוד דרכים להתחיל ללמוד</h2>
            <Link href="/programs/prep">מכינה קדם־אקדמית</Link>
            <Link href="/transfer">אפיקי מעבר והכרה בלימודים</Link>
            <Link href="/psychometric-two-domain">על הפסיכומטרי הדו־תחומי</Link>
          </nav>
        </article>
      </main>
    </WayPageShell>
  );
}
