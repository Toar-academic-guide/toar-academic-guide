import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import JsonLd from '@/components/seo/JsonLd';
import {
  atudaBooklet,
  atudaElite,
  atudaIdfPage,
  atudaMajors,
  atudaQuestions,
  bookletPage,
} from '@/data/atuda';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const title = 'עתודה אקדמית 2027–2028: תנאי קבלה, 590 בפסיכומטרי ומועדים | MyWay';
const description =
  'עתודה אקדמית תשפ״ח: נרשמים עד 28.02.2027, ציון מינימום 590 בפסיכומטרי, מועד אפריל 2027 הוא האחרון. מענקים, תוכניות עילית ומגמות לפי מוסד, עם מקור לכל נתון.';
const canonical = absoluteUrl('/atuda');

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

const timeline = [
  {
    when: 'יולי 2026 – 28.02.2027',
    action:
      'נרשמים בשאלון העתודה באזור האישי באתר ״מתגייסים״. השאלון נפתח רק למי שעומד בנתוני קצונה.',
    pages: [18],
  },
  {
    when: 'עד 10.2.2027',
    action: 'נרשמים במאל״ו למועד אפריל בפסיכומטרי, המועד האחרון שנחשב לעתודה.',
    pages: [20],
  },
  {
    when: 'עד 28.02.2027',
    action: 'מעבירים למיטב אישור הרשמה לפסיכומטרי או ציון. בלי האישור המועמדות מוסרת.',
    pages: [11, 18],
  },
  {
    when: 'מרץ 2027',
    action: 'נרשמים למוסד האקדמי, רק אחרי קבלת אישור ממיטב.',
    pages: [18],
  },
  {
    when: '18–19.4.2027',
    action: 'נבחנים במועד אפריל, האחרון הרלוונטי. מועד יולי אפשרי רק בבקשה חריגה ובאישור מיטב.',
    pages: [10, 20],
  },
  {
    when: 'דצמבר 2026 – יוני 2027',
    action: 'מיון אישיותי, ברובו מקוון, למי שעבר את סף המיון.',
    pages: [11],
  },
  {
    when: 'לקראת ספטמבר 2027',
    action: 'ועדת הקבלה של העתודה מחליטה מי מתקבל, לאיזה מוסד ולאיזו מגמה.',
    pages: [11],
  },
  {
    when: 'אוקטובר 2027',
    action: 'המתקבלים מתגייסים, סמוך לפתיחת שנת הלימודים.',
    pages: [11],
  },
] as const;

function PageSources({ pages }: { pages: readonly number[] }) {
  return (
    <span className={styles.pageSources}>
      {pages.map((page, index) => (
        <span key={page}>
          {index > 0 && ' · '}
          <a href={bookletPage(page)}>עמ׳ {page}</a>
        </span>
      ))}
    </span>
  );
}

function BidiRanges({ text }: { text: string }) {
  return text.split(/(2027–2028|35–36)/g).map((part, index) =>
    part === '2027–2028' || part === '35–36' ? (
      <bdi dir="ltr" key={index}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

export default function Page() {
  const reviewDue = Date.now() > Date.UTC(2027, 7, 17);
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <JsonLd
          data={[
            {
              '@type': 'FAQPage',
              '@id': `${canonical}#faq`,
              mainEntity: atudaQuestions.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${canonical}#breadcrumb`,
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'דף הבית', item: absoluteUrl('/') },
                { '@type': 'ListItem', position: 2, name: 'עתודה אקדמית', item: canonical },
              ],
            },
          ]}
        />
        <article>
          <header>
            <h1>
              עתודה אקדמית <bdi dir="ltr">2027–2028</bdi> (תשפ״ח): איך נרשמים, עד מתי ומה הציון
              הנדרש
            </h1>
            <p className={styles.source}>
              מקור:{' '}
              <a className={styles.bookletLink} href={atudaBooklet}>
                מידעון העתודה האקדמית של צה״ל לשנת <bdi dir="ltr">2027–2028</bdi>
              </a>{' '}
              ו<a href={atudaIdfPage}>אתר העתודה של צה״ל</a>
            </p>
            {reviewDue && (
              <p className={styles.reviewDue}>
                המידע לשנה זו בבדיקה מחדש. בדקו גם את המידעון העדכני של צה״ל.
              </p>
            )}
            <p className={styles.answer}>
              <strong>העתודה האקדמית</strong> היא מסלול של צה״ל שבו לומדים תואר לפני השירות ומשרתים
              אחריו כקצינים במקצוע. לשנת הלימודים <bdi dir="ltr">2027–2028</bdi> נרשמים בשאלון
              העתודה באתר ״מתגייסים״ עד <bdi dir="ltr">28.02.2027</bdi>. הרישום נפתח רק למי שעומד
              בנתוני קצונה. ציון המינימום בפסיכומטרי הוא <bdi dir="ltr">590</bdi>, והמועד האחרון
              להיבחן הוא אפריל <bdi dir="ltr">2027</bdi>.
            </p>
            <p className={styles.source}>
              מידעון צה״ל <bdi dir="ltr">2027–2028</bdi>, <PageSources pages={[9, 10, 18]} />
            </p>
          </header>

          <section className={styles.section} aria-labelledby="timeline">
            <h2 id="timeline">
              לוח זמנים לשנת הלימודים <bdi dir="ltr">2027–2028</bdi>
            </h2>
            <div className={styles.tableWrap}>
              <table className={styles.timelineTable}>
                <thead>
                  <tr>
                    <th scope="col">מתי</th>
                    <th scope="col">מה עושים</th>
                    <th scope="col">מקור</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map(({ when, action, pages }) => (
                    <tr key={when + action}>
                      <th scope="row">
                        <bdi dir="ltr">{when}</bdi>
                      </th>
                      <td>{action}</td>
                      <td>
                        <PageSources pages={pages} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              צה״ל ממליץ להיבחן כבר במועד דצמבר <bdi dir="ltr">2026</bdi> (
              <bdi dir="ltr">4 ו־6.12.2026</bdi>; ההרשמה אליו נסגרה ב־
              <bdi dir="ltr">14.10.2026</bdi>).{' '}
              <Link href="/psychometric-dates">לוח מועדי הפסיכומטרי המלא</Link>
            </p>
          </section>

          <section className={styles.section} aria-labelledby="score">
            <h2 id="score">מה הציון הנדרש?</h2>
            <p>
              <bdi dir="ltr">590</bdi> בציון הרב־תחומי הוא המינימום להמשך המיונים בעתודה, למעט
              מסלולים חריגים שבהם הרף שונה. הציון נבחן מחדש כל שנה (<PageSources pages={[10]} />
              ).
            </p>
            <p>
              זהו רף של צה״ל בלבד. כדי להתחיל ללמוד צריך להתקבל גם למוסד ולמגמה לפי תנאי הקבלה שלהם.{' '}
              <Link href="/sekhem-calculator">בדקו את הסיכוי שלכם במחשבון</Link>.
            </p>
            <p>
              קבלה ללא פסיכומטרי אפשרית רק במקרים חריגים: באוניברסיטאות בלבד, כשמתקבלים למסלול
              מצטיינים על סמך ציוני בגרות, ובבקשה מסודרת למיטב (<PageSources pages={[10, 18]} />
              ). <Link href="/without-psychometric">עוד על קבלה בלי פסיכומטרי</Link>.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="elite">
            <h2 id="elite">תוכניות עילית: דרישות סף</h2>
            <div className={styles.tableWrap}>
              <table className={styles.eliteTable}>
                <thead>
                  <tr>
                    <th scope="col">תוכנית</th>
                    <th scope="col">מה לומדים ואיפה</th>
                    <th scope="col">פסיכומטרי מינימלי</th>
                    <th scope="col">דפ״ר מינימלי</th>
                  </tr>
                </thead>
                <tbody>
                  {atudaElite.map(({ name, studies, psychometric, dapar }) => (
                    <tr key={name}>
                      <th scope="row">{name}</th>
                      <td>{studies}</td>
                      <td>
                        <bdi dir="ltr">{psychometric}</bdi>
                      </td>
                      <td>{dapar === 'לא צוין בעמוד' ? dapar : <bdi dir="ltr">{dapar}</bdi>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.source}>
              דרישות סף בלבד, לא ציון קבלה. ״צמרת״ (רפואה) ו״בינה״ (רפואת שיניים) מופיעות בפרק
              מקצועות הרפואה, ושתיהן בירושלים בלבד (<PageSources pages={[16, 35, 36]} />
              ).
            </p>
          </section>

          <section className={styles.section} aria-labelledby="majors">
            <h2 id="majors">באילו מוסדות אפשר ללמוד? מגמות נבחרות</h2>
            <p>
              אלה מגמות מתוך רשימת צה״ל לשנת <bdi dir="ltr">2027–2028</bdi>. צה״ל מוסיף ומסיר מגמות
              מדי פעם; הרשימה המלאה במידעון (<PageSources pages={[12, 13, 14, 15, 16]} />
              ). בוחרים לפחות שתי מגמות ועד שלושה מוסדות לכל מגמה (<PageSources pages={[11]} />
              ).
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.majorsTable}>
                <thead>
                  <tr>
                    <th scope="col">מגמה</th>
                    <th scope="col">מוסדות לפי המידעון</th>
                    <th scope="col">מקור</th>
                  </tr>
                </thead>
                <tbody>
                  {atudaMajors.map((major) => (
                    <tr key={major.name}>
                      <th scope="row">{major.name}</th>
                      <td>
                        <ul className={styles.institutions}>
                          {major.institutions.map((institution) => (
                            <li key={institution.name}>
                              {institution.page ? (
                                <Link href={`/programs/${institution.page}`}>
                                  {institution.name}
                                  {institution.engineeringPage ? ': עמוד ההנדסה' : ''}
                                </Link>
                              ) : (
                                institution.name
                              )}
                            </li>
                          ))}
                        </ul>
                        {major.note && <p className={styles.majorNote}>{major.note}</p>}
                      </td>
                      <td>
                        <PageSources pages={[major.bookletPage]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.source}>
              חלק מהמגמות לא נפתחות בכל שנה, ובחלקן מספר המקומות מצומצם. בדקו את{' '}
              <a href={bookletPage(17)}>עמ׳ 17 במידעון</a>.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="grants">
            <h2 id="grants">מענקים</h2>
            <p>
              מענק עידוד עתודה: <bdi dir="ltr">10,500 ש״ח</bdi> בכל שנת לימוד, כל עוד עומדים בקצב
              צבירת נקודות תקין ובממוצע <bdi dir="ltr">75</bdi> ומעלה. בחלק מהמסלולים נדרש ממוצע
              גבוה יותר. בנוסף, <bdi dir="ltr">2,500 ש״ח</bdi> לכיסוי עלויות הפסיכומטרי וההרשמה,
              למתקבלים שהתגייסו בפועל, במהלך שנה א׳ (<PageSources pages={[28]} />
              ).
            </p>
          </section>

          <section className={styles.section} aria-labelledby="faq">
            <h2 id="faq">שאלות נפוצות</h2>
            {atudaQuestions.map(({ question, answer }) => (
              <div key={question} className={styles.question}>
                <h3>
                  <BidiRanges text={question} />
                </h3>
                <p>
                  <BidiRanges text={answer} />
                </p>
              </div>
            ))}
          </section>
        </article>
      </main>
    </WayPageShell>
  );
}
