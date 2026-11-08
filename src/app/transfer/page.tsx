import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const title = 'מעבר בין מוסדות לימוד אקדמיים: קבלה והכרה בקורסים | MyWay';
const description =
  'איך מתכננים מעבר בין מוסדות לימוד אקדמיים: קבלה לתוכנית על סמך לימודים קודמים, הכנת מסמכים ובקשת הכרה בקורסים, עם קישורים למקורות הרשמיים.';
const canonical = absoluteUrl('/transfer');

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

const sources = [
  {
    href: 'https://go.tau.ac.il/he/ba/partial-studies',
    label: 'קבלה לתואר ראשון על סמך השכלה אקדמית חלקית או מלאה — אוניברסיטת תל אביב',
    detail: 'מסלול הקבלה ותנאי התוכנית המבוקשת.',
  },
  {
    href: 'https://go.tau.ac.il/he/ba/process-doc',
    label: 'מסמכי הרשמה לתואר ראשון — אוניברסיטת תל אביב',
    detail: 'הנחיות לבעלי השכלה אקדמית קודמת.',
  },
  {
    href: 'https://coller.tau.ac.il/BA-students/programs/2026-27/management/rules/student-exemption',
    label: 'נוהל פטור מקורסים בחוג לניהול — אוניברסיטת תל אביב, תשפ״ז',
    detail: 'דוגמה לנוהל של חוג מסוים.',
  },
  {
    href: 'https://www.openu.ac.il/transfertrack/pages/default.aspx',
    label: 'אפיקי מעבר — האוניברסיטה הפתוחה',
    detail: 'מסלולים לפי מוסד ותוכנית יעד.',
  },
  {
    href: 'https://www.openu.ac.il/transfertrack/pages/faq.aspx',
    label: 'שאלות נפוצות על אפיקי מעבר — האוניברסיטה הפתוחה',
    detail: 'מבנה האפיק והקורסים הנדרשים בו.',
  },
  {
    href: 'https://stuad.biu.ac.il/node/52',
    label: 'פטור והכרה בלימודים קודמים — אוניברסיטת בר־אילן',
    detail: 'הגורם המאשר והנהלים באוניברסיטה.',
  },
];

export default function TransferPage() {
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <article>
          <header>
            <h1>עוברים מוסד באמצע התואר? מתחילים בשתי בדיקות נפרדות</h1>
            <p className={styles.lead}>
              במעבר בין מוסדות לימוד יש שתי החלטות נפרדות: קבלה לתוכנית במוסד החדש, והכרה בקורסים
              שכבר למדתם. הכינו לכל אחת מהן את המסמכים והבקשה המתאימים, כדי לתכנן את המשך הלימודים.
            </p>
            <p className={styles.stamp}>
              נבדק בתאריך <time dateTime="2026-11-08">8.11.2026</time>
            </p>
          </header>

          <section aria-labelledby="admission" className={styles.section}>
            <h2 id="admission">קבלה לתוכנית החדשה</h2>
            <ol>
              <li>בחרו את התוכנית שאליה תרצו לעבור ופתחו את תנאי הקבלה שלה.</li>
              <li>
                חפשו את מסלול המועמדות לבעלי לימודים אקדמיים קודמים. בדקו אילו מסמכים נדרשים ומה
                המועדים שמופיעים בהנחיות של התוכנית.
              </li>
              <li>
                לדוגמה, ההנחיות של אוניברסיטת תל אביב לבעלי השכלה אקדמית קודמת מבקשות אישור רשמי
                מהמסגרת שבה למדתם, ובו הקורסים, הציונים, שעות הלימוד והממוצע. הדרישות משתנות לפי
                התוכנית.
              </li>
            </ol>
            <p className={styles.source}>
              <a href="https://go.tau.ac.il/he/ba/partial-studies">
                מסלול קבלה על סמך השכלה אקדמית קודמת בתל אביב
              </a>
              {' · '}
              <a href="https://go.tau.ac.il/he/ba/process-doc">מסמכי ההרשמה לבעלי השכלה אקדמית</a>
            </p>
          </section>

          <section aria-labelledby="recognition" className={styles.section}>
            <h2 id="recognition">הכרה בקורסים שכבר למדתם</h2>
            <ol>
              <li>
                הכינו גיליון ציונים רשמי וסילבוסים רשמיים של הקורסים שתרצו להציג. בדקו בנוהל של החוג
                אילו מסמכים נוספים נדרשים.
              </li>
              <li>
                מצאו בנוהל מי מקבל את הבקשה ומתי מגישים אותה. לדוגמה, בחוג לניהול באוניברסיטת תל
                אביב הבקשה מוגשת למזכירות החוג עם גיליון ציונים וסילבוס רשמיים, לפי המועד שבנוהל.
              </li>
              <li>תכננו את המשך הקורסים לאחר קבלת ההחלטה בבקשה.</li>
            </ol>
            <p className={styles.source}>
              <a href="https://coller.tau.ac.il/BA-students/programs/2026-27/management/rules/student-exemption">
                נוהל הפטורים בחוג לניהול בתל אביב — תשפ״ז
              </a>
              {' · '}
              <a href="https://stuad.biu.ac.il/node/52">הכרה בלימודים קודמים בבר־אילן</a>
            </p>
          </section>

          <section aria-labelledby="open-university" className={styles.section}>
            <h2 id="open-university">לומדים באפיק מעבר של האוניברסיטה הפתוחה?</h2>
            <p>
              אפיק מעבר מפרט את הקורסים וההישגים הנדרשים לקבלה לתוכנית היעד, ולעיתים גם את הפטורים
              הניתנים עבורם. התחילו ברשימת האפיקים ובדקו את התנאים של התוכנית שאליה תרצו לעבור.
            </p>
            <p className={styles.source}>
              <a href="https://www.openu.ac.il/transfertrack/pages/default.aspx">
                רשימת אפיקי המעבר הרשמית
              </a>
              {' · '}
              <a href="https://www.openu.ac.il/transfertrack/pages/faq.aspx">
                שאלות נפוצות על אפיקי מעבר
              </a>
              {' · '}
              <Link href="/institutions/open_university">האוניברסיטה הפתוחה ב־MyWay</Link>
            </p>
          </section>

          <section aria-labelledby="sources" className={styles.section}>
            <h2 id="sources">מקורות רשמיים</h2>
            <ul>
              {sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href}>{source.label}</a> — {source.detail}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="myway" className={styles.cta}>
            <h2 id="myway">עוד לא התחלתם תואר?</h2>
            <p>
              מחשבון הסכם של MyWay מיועד לבדיקת מסלולי קבלה לשנה הראשונה. בקשות להכרה בקורסים
              מטופלות במסלול נפרד.
            </p>
            <div className={styles.links}>
              <Link href="/sekhem-calculator">למחשבון הסכם</Link>
              <Link href="/institutions">למציאת מוסד ותוכנית</Link>
            </div>
          </section>
        </article>
      </main>
    </WayPageShell>
  );
}
