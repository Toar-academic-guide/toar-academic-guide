import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const title = 'התאמות לפסיכומטרי: אבחון, תוקף ובקשה למוסד | MyWay';
const description =
  'מי זכאי לבחינה פסיכומטרית בתנאים מותאמים, מתי אבחון נחשב עדכני, ולמה אישור למאל״ו לא עובר אוטומטית לאמירנט או למוסד הלימודים. לפי הכללים הרשמיים של מאל״ו.';
const canonical = absoluteUrl('/psychometric-accommodations');
const checkedOn = '14.11.2026';
const nite = {
  accommodations: 'https://www.nite.org.il/special-test-accommodations/',
  learning:
    'https://www.nite.org.il/special-test-accommodations/learning-disablity-accommodations/',
  faq: 'https://www.nite.org.il/special-test-accommodations/faq/',
  amirnet: 'https://www.nite.org.il/other-tests/amirnet/',
};
const institutionalAccommodations =
  'https://www.gov.il/BlobFolder/guide/higher_education_rights/en/sitedocs_higher_education_rights.pdf';

const questions = [
  {
    question: 'איזה אבחון מתאים לבקשת התאמות לפסיכומטרי?',
    answer:
      'מאל״ו מקבל בקשה בשל לקות למידה, הפרעת קשב, אוטיזם, מגבלה גופנית או נפשית. ללקות למידה דרוש אבחון תפקודי למידה דידקטי או פסיכודידקטי מאיש מקצוע המוסמך לאבחן מבוגרים, בצירוף שאלון למאבחן. לאבחון מת״ל עדכני אין צורך בשאלון למאבחן.',
  },
  {
    question: 'מתי האבחון נחשב עדכני?',
    answer:
      'ללקות למידה, לפי מאל״ו: אבחון שנערך אחרי גיל 18, או אבחון שנערך אחרי גיל 16 ולא עברו 5 שנים מיום עריכתו. לכל סיבה אחרת יש לבדוק את רשימת המסמכים בעמוד הרשמי של אותה סיבה.',
  },
  {
    question: 'האם אותו מסמך תופס גם באמירנט וגם במוסד הלימודים?',
    answer:
      'לא אוטומטית. למאל״ו יש להגיש בקשה נפרדת לכל בחינה, כולל אמירנט. את ההתאמות במוסד הלימודים קובע המוסד עצמו, ויש להגיש בקשה לפי הכללים שלו.',
  },
  {
    question: 'האם מקבלים את ההתאמות שהמאבחן המליץ עליהן?',
    answer:
      'לא בהכרח. מאל״ו כותב שהדו״ח חיוני להחלטה, אבל האישור עצמו ניתן לפי מאפייני הבחינה ולפי שיקוליו של המרכז.',
  },
];

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

export default function Page() {
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <JsonLd
          data={{
            '@type': 'FAQPage',
            '@id': `${canonical}#faq`,
            mainEntity: questions.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          }}
        />
        <article>
          <header>
            <h1>התאמות לפסיכומטרי: איזה אבחון, לכמה זמן, והאם הוא תופס גם במוסד?</h1>
            <p className={styles.answer}>
              מאל״ו מאשר בחינה בתנאים מותאמים בשל לקות למידה, הפרעת קשב, אוטיזם, מגבלה גופנית או
              נפשית. ללקות למידה דרוש דו״ח עדכני: אחרי גיל <bdi dir="ltr">18</bdi>, או אחרי גיל{' '}
              <bdi dir="ltr">16</bdi> אם לא עברו חמש שנים, וגם שאלון למאבחן, למעט באבחון מת״ל עדכני.
              אישור לבחינה הפסיכומטרית אינו עובר אוטומטית לאמירנט ולא למוסד הלימודים. לכל בחינה ולכל
              מוסד מגישים בקשה נפרדת.
            </p>
            <p className={styles.source}>
              הכללים ללקות למידה ולאופן הגשת הבקשה: <a href={nite.learning}>מאל״ו</a>, נבדק{' '}
              <bdi dir="ltr">{checkedOn}</bdi>. לכל סיבת בקשה אחרת יש רשימת מסמכים נפרדת{' '}
              <a href={nite.accommodations}>בעמוד הרשמי</a>.
            </p>
          </header>

          <section aria-labelledby="documents" className={styles.section}>
            <h2 id="documents">מי יכול לבקש, ומה שולחים</h2>
            <p>
              אפשר לבקש בחינה בתנאים מותאמים בשל לקות למידה, הפרעת קשב ופעלתנות יתר, הפרעה על הרצף
              האוטיסטי, מגבלה גופנית או מגבלה נפשית. אפשר לציין יותר מסיבה אחת.
            </p>
            <p className={styles.source}>
              <a href={nite.accommodations}>בחינה בתנאים מותאמים באתר מאל״ו</a> · נבדק{' '}
              <bdi dir="ltr">{checkedOn}</bdi>
            </p>
            <h3>בקשה בשל לקות למידה</h3>
            <p>
              מגישים דו״ח אבחון תפקודי למידה מאיש מקצוע המוסמך לאבחן לקויות למידה אצל מבוגרים.
              האבחון יכול להיות דידקטי או פסיכודידקטי, כל עוד הוא בודק את תפקודי הלמידה.
            </p>
            <p>
              אבחון עדכני, כלשון מאל״ו: אבחון שנערך אחרי גיל <bdi dir="ltr">18</bdi>, או אבחון שנערך
              אחרי גיל <bdi dir="ltr">16</bdi> ולא עברו <bdi dir="ltr">5</bdi> שנים מיום עריכתו.
            </p>
            <p>
              לצד האבחון מצרפים שאלון למאבחן ומסמכי רקע מגיל צעיר. כדאי למסור את השאלון למאבחן לפני
              תחילת האבחון. האבחון צריך לבדוק את התפקוד בשפת האם; אם נבחנים בשפה אחרת, עליו לכלול גם
              נתונים על התפקוד בשפת הבחינה.
            </p>
            <p>
              לאבחון מת״ל עדכני אין צורך להוסיף שאלון למאבחן, אך עדיין צריך לצרף מסמכי רקע מגיל
              צעיר.
            </p>
            <p>
              ללקות כתיבה בלבד מאל״ו מפרסם כלל נפרד: הערכה אחרי גיל <bdi dir="ltr">12</bdi> שלא עברו{' '}
              <bdi dir="ltr">5</bdi> שנים מיום עריכתה, עם חריג להערכה שנעשתה אחרי גיל{' '}
              <bdi dir="ltr">18</bdi>. אין להחיל את כלל גיל <bdi dir="ltr">16/18</bdi> על קשב,
              אוטיזם או מגבלה גופנית או נפשית; בדקו את רשימת המסמכים לסיבת הבקשה שלכם באתר מאל״ו.
            </p>
            <p className={styles.source}>
              <a href={nite.learning}>בקשה בשל לקות למידה באתר מאל״ו</a> · נבדק{' '}
              <bdi dir="ltr">{checkedOn}</bdi>
            </p>
            <p>
              המלצות המאבחן אינן מאושרות אוטומטית. מאל״ו קובע את התנאים לפי מאפייני הבחינה והחומר
              שהוגש.
            </p>
            <p className={styles.source}>
              <a href={nite.faq}>שאלות ותשובות באתר מאל״ו</a> · נבדק{' '}
              <bdi dir="ltr">{checkedOn}</bdi>
            </p>
          </section>

          <section aria-labelledby="separate-requests" className={styles.section}>
            <h2 id="separate-requests">האם מסמך אחד תופס גם בבחינה וגם במוסד</h2>
            <p>
              אישור לתנאים מותאמים בפסיכומטרי אינו מעניק אוטומטית תנאים באמירנט. מאל״ו דורש בקשה
              נפרדת לכל בחינה, גם אם כבר אושרו תנאים לבחינה אחרת.
            </p>
            <p>
              החל ממועד דצמבר <bdi dir="ltr">2026</bdi>, הבחינה הפסיכומטרית המותאמת אינה כוללת
              אנגלית. מי שצריך התאמות באנגלית נבחן באמירנט ומגיש בקשה לאותה בחינה.
            </p>
            <p>
              המסמך שמוגש למאל״ו אינו מחליף בקשה למוסד הלימודים. את ההתאמות בלימודים ובבחינות
              האקדמיות קובע המוסד לפי הכללים שלו.
            </p>
            <p className={styles.source}>
              <a href={nite.faq}>בקשות נפרדות לפי מאל״ו</a> · נבדק <bdi dir="ltr">{checkedOn}</bdi>{' '}
              ·{' '}
              <a href={institutionalAccommodations}>
                התאמות במוסד הלימודים לפי נציבות שוויון זכויות לאנשים עם מוגבלות
              </a>{' '}
              · נבדק <bdi dir="ltr">{checkedOn}</bdi>
            </p>
          </section>

          <section aria-labelledby="faq" className={styles.section}>
            <h2 id="faq">שאלות נפוצות</h2>
            {questions.map(({ question, answer }) => (
              <div key={question} className={styles.question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </div>
            ))}
          </section>

          <nav aria-label="מדריכים נוספים" className={styles.related}>
            <Link href="/psychometric-dates">מועדי הפסיכומטרי</Link>
            <Link href="/psychometric-two-domain">הפסיכומטרי הדו־תחומי</Link>
            <Link href="/sekhem-calculator">מחשבון סכם</Link>
            <a href={nite.amirnet}>מידע רשמי על אמירנט</a>
          </nav>
        </article>
      </main>
    </WayPageShell>
  );
}
