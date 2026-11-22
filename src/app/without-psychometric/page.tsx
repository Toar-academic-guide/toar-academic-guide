import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/seo/JsonLd';
import AdmissionGuidanceText from '@/components/seo/AdmissionGuidanceText';
import alternatives from '@/data/admissionAlternatives.json';
import WayPageShell from '@/components/WayPageShell';
import { withoutPsychometricRoutes } from '@/data/withoutPsychometricRoutes';
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
  'תוכניות לימוד עם מסלול קבלה לפי בגרות ללא פסיכומטרי. תנאים ומועד בדיקה לכל מסלול.';
const canonical = absoluteUrl('/without-psychometric');
const faq = [...alternatives.prep.faq, ...alternatives.sat.faq];
const satColumns = [
  ['sat', 'SAT'],
  ['act', 'ACT'],
  ['excluded', 'לא מתקבל ל־'],
  ['conversion', 'איך מומר הציון'],
  ['both', 'יש גם פסיכומטרי?'],
] as const;

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
        <JsonLd
          data={{
            '@type': 'FAQPage',
            '@id': `${canonical}#faq`,
            mainEntity: faq.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          }}
        />
        <article>
          <header className={styles.header}>
            <p className={styles.eyebrow}>תנאי קבלה</p>
            <h1>לימודים בלי פסיכומטרי</h1>
            <p className={styles.lead}>
              <AdmissionGuidanceText text={alternatives.prep.intro} />
            </p>
          </header>

          <section className={styles.guidance} aria-labelledby="prep-choice-heading">
            <h2 id="prep-choice-heading">{alternatives.prep.title}</h2>
            <p>
              <AdmissionGuidanceText text={alternatives.prep.answer} />
            </p>
            <p>
              <AdmissionGuidanceText text={alternatives.prep.haifa} />
            </p>
            <p>
              להשוואת מכינות לפי מה שהתעודה מחליפה:{' '}
              <Link href="/programs/prep">מכינה קדם־אקדמית</Link>.
            </p>
            <Link href="/sekhem-calculator">בדקו איך הפסיכומטרי נכנס לסכם</Link>
          </section>
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
                          {programHref && <Link href={programHref}>עמוד התוכנית</Link>}
                          {calculator && (
                            <Link
                              href={`/sekhem-calculator?program=${encodeURIComponent(program.id)}`}
                            >
                              בדקו במחשבון
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className={styles.guidance} aria-labelledby="sat-heading">
            <h2 id="sat-heading">{alternatives.sat.title}</h2>
            <p>
              <AdmissionGuidanceText text={alternatives.sat.answer} />
            </p>
            <table className={styles.satTable} aria-labelledby="sat-heading">
              <caption>{alternatives.sat.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">מוסד</th>
                  {satColumns.map(([key, label]) => (
                    <th scope="col" key={key}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alternatives.sat.rows.map((row) => (
                  <tr key={row.institution}>
                    <th scope="row">{row.institution}</th>
                    {satColumns.map(([key, label]) => (
                      <td key={key} data-label={label}>
                        <AdmissionGuidanceText text={row[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className={styles.guidance} aria-labelledby="faq-heading">
            <h2 id="faq-heading">שאלות נפוצות</h2>
            {faq.map(({ question, answer }) => (
              <div className={styles.faq} key={question}>
                <h3>{question}</h3>
                <p>
                  <AdmissionGuidanceText text={answer} />
                </p>
                {question === 'האם מכינה מחליפה בגרות או פסיכומטרי?' && (
                  <Link href="/programs/prep">לטבלת המכינות</Link>
                )}
              </div>
            ))}
          </section>
          <nav aria-label="דרכים נוספות ללימודים" className={styles.more}>
            <h2>עוד דרכים להתחיל ללמוד</h2>
            <Link href="/programs/prep">מכינה קדם־אקדמית</Link>
            <Link href="/calculator">מחשבון סיכויי קבלה</Link>
            <Link href="/transfer">אפיקי מעבר והכרה בלימודים</Link>
            <Link href="/psychometric-two-domain">על הפסיכומטרי הדו־תחומי</Link>
          </nav>
        </article>
      </main>
    </WayPageShell>
  );
}
