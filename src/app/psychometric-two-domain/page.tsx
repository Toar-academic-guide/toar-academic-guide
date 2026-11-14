import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const title = 'פסיכומטרי דו־תחומי: הבחינה, הציונים ותנאי הקבלה | MyWay';
const description =
  'מה משתנה בפסיכומטרי מדצמבר 2026, איך מחושב הציון, מה קורה לציונים קודמים ומה לבדוק לקראת הרשמה ללימודים. מדריך עם מקורות מאל״ו.';
const canonical = absoluteUrl('/psychometric-two-domain');
const nite = {
  announcement: 'https://www.nite.org.il/news/notice-081026/',
  faq: 'https://www.nite.org.il/two-domain-psychometric-entrance-test/faqs/',
  scoring: 'https://www.nite.org.il/two-domain-psychometric-entrance-test/scores/calculation/',
  preparation: 'https://www.nite.org.il/two-domain-psychometric-entrance-test/preparation-1/',
  amirnet: 'https://www.nite.org.il/other-tests/amirnet/',
  personalArea: 'https://niteop.nite.org.il/#/personal-area/login',
  amirnetRegistration: 'https://niteop.nite.org.il/#/net-registration/J,2',
};
const sections = [
  ['changes', 'מה משתנה?'],
  ['scores', 'איך מחושב הציון?'],
  ['first-exam', 'ניגשים בפעם הראשונה'],
  ['existing-scores', 'כבר יש לכם ציון'],
  ['admissions', 'איזה ציון נחשב?'],
  ['questions', 'שאלות נפוצות'],
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

export default function Page() {
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <article>
          <header>
            <h1>פסיכומטרי דו־תחומי: מה משתנה ומה זה אומר עבורכם</h1>
            <p className={styles.lead}>
              החל ממועד דצמבר <bdi dir="ltr">2026</bdi>, הפסיכומטרי בוחן חשיבה מילולית וכמותית.
              האנגלית נבחנת בנפרד. כאן תוכלו להבין איך נראית הבחינה, מה קורה לציון שכבר יש לכם ואילו
              פרטים לבדוק לקראת ההרשמה ללימודים.
            </p>
            <p className={styles.stamp}>
              נבדק בתאריך{' '}
              <time dateTime="2026-11-06">
                <bdi dir="ltr">6.11.2026</bdi>
              </time>
              {' · '}
              <a href={nite.announcement}>העדכון באתר מאל״ו</a>
            </p>
          </header>

          <nav className={styles.contents} aria-label="תוכן המדריך">
            <ul>
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="changes" className={styles.section}>
            <h2 id="changes">מה משתנה בבחינה?</h2>
            <p>
              במקום שלושה תחומים, הבחינה כוללת שניים. מטלת הכתיבה נשארת, ואחריה חמישה פרקי שאלות:
              שניים במילולי, שניים בכמותי ופרק ניסיוני שאינו נכלל בציון. הפרק הניסיוני יכול להיות
              בכל אחד משני התחומים, וסדר הפרקים אינו קבוע.
            </p>
            <p>
              משך הבחינה הוא כשעתיים וחצי, ללא הפסקות מתוכננות. פרקי האנגלית אינם חלק ממנה; לצורך
              בחינה באנגלית ניגשים לאמירנט.
            </p>
            <p className={styles.source}>
              <a href={nite.announcement}>מבנה הבחינה לפי מאל״ו</a>
            </p>
            <h3>ומה עם האנגלית?</h3>
            <p>
              אמירנט היא בחינת אנגלית ממוחשבת. אפשר להירשם אליה דרך מאל״ו ולהיבחן במרכזי הבחינות
              שלו. לעיתים היא מתקיימת גם במוסדות לימוד, ובהרשמה דרכם יש לבדוק את ההנחיות של המוסד.
              מידע על הבחינה וההרשמה מופיע ב<a href={nite.amirnet}>עמוד אמירנט באתר מאל״ו</a>.
            </p>
          </section>

          <section aria-labelledby="scores" className={styles.section}>
            <h2 id="scores">איך מחושב הציון?</h2>
            <p>
              ציוני התחומים, מילולי וכמותי, ניתנים בסולם <bdi dir="ltr">50–150</bdi>. מאל״ו משקלל
              אותם וממיר את התוצאה לציונים כלליים בסולם <bdi dir="ltr">200–800</bdi>. אלה סולמות
              שונים: ממוצע של שני ציוני התחומים אינו הציון הכללי שלכם.
            </p>
            <table className={styles.weights}>
              <caption>משקל התחומים בציוני המתכונת החדשה</caption>
              <thead>
                <tr>
                  <th scope="col">סוג הציון</th>
                  <th scope="col">מילולי</th>
                  <th scope="col">כמותי</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">דו־תחומי</th>
                  <td>
                    <bdi dir="ltr">50%</bdi>
                  </td>
                  <td>
                    <bdi dir="ltr">50%</bdi>
                  </td>
                </tr>
                <tr>
                  <th scope="row">בדגש כמותי</th>
                  <td>
                    <bdi dir="ltr">25%</bdi>
                  </td>
                  <td>
                    <bdi dir="ltr">75%</bdi>
                  </td>
                </tr>
                <tr>
                  <th scope="row">בדגש מילולי</th>
                  <td>
                    <bdi dir="ltr">75%</bdi>
                  </td>
                  <td>
                    <bdi dir="ltr">25%</bdi>
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              למשל, בציון בדגש כמותי לתחום הכמותי יש פי שלושה משקל מהתחום המילולי. כל תוכנית לימודים
              קובעת באיזה סוג ציון היא משתמשת.
            </p>
            <p>
              מטלת הכתיבה היא חלק מהציון המילולי: משקלה <bdi dir="ltr">25%</bdi> ממנו, ושאלות הברירה
              במילולי משלימות את יתרת ה־<bdi dir="ltr">75%</bdi>.
            </p>
            <p className={styles.source}>
              <a href={nite.scoring}>הסבר חישוב הציונים באתר מאל״ו</a>
            </p>
          </section>

          <section aria-labelledby="first-exam" className={styles.section}>
            <h2 id="first-exam">ניגשים בפעם הראשונה?</h2>
            <ol>
              <li>
                <strong>בדקו את לוח הזמנים.</strong> בחרו מועד שמאפשר להעביר ציונים בזמן לתוכנית
                שאליה תרצו להירשם.{' '}
                <Link href="/psychometric-dates">למועדי הפסיכומטרי וסיום ההרשמה</Link>.
              </li>
              <li>
                <strong>הירשמו לבחינות הדרושות לכם.</strong> הרשמה לפסיכומטרי אינה רושמת אתכם
                אוטומטית לאמירנט. אם נדרשת לכם בחינת אנגלית, הירשמו גם אליה בנפרד ב
                <a href={nite.amirnetRegistration}>אתר ההרשמה של מאל״ו</a>.
              </li>
              <li>
                <strong>הכירו את השאלות ותרגלו.</strong> התחילו ב
                <a href={nite.preparation}>חומרי ההכנה ובחינות ההתנסות של מאל״ו</a>. בחרו חומרים
                למתכונת הדו־תחומית, ותרגלו גם את מטלת הכתיבה ואת ניהול הזמן.
              </li>
            </ol>
            <p className={styles.source}>
              <a href={nite.faq}>הנחיות מאל״ו להרשמה ולתכנון מועדי הבחינות</a>
            </p>
          </section>

          <section aria-labelledby="existing-scores" className={styles.section}>
            <h2 id="existing-scores">כבר יש לכם ציון?</h2>
            <p>
              השינוי כשלעצמו אינו מחייב בחינה חוזרת. לפי מאל״ו, הציון הקודם תקף לפחות שבע שנים ממועד
              הבחינה; בחלק מהמוסדות התקופה ארוכה יותר.
            </p>
            <h3>איפה רואים את הציון הדו־תחומי?</h3>
            <p>
              ב<a href={nite.personalArea}>אזור האישי באתר מאל״ו</a> מופיע גם ציון דו־תחומי המחושב
              מהבחינה הקודמת, ללא האנגלית. לעומתו, הציונים הקודמים בדגש כמותי ובדגש מילולי לא חושבו
              מחדש: הם נשארו מבוססים על שלושת התחומים של הבחינה שבה נבחנתם.
            </p>
            <p className={styles.source}>
              <a href={nite.announcement}>עדכון מאל״ו על ציוני נבחנים קודמים</a>
            </p>
            <h3>ומה קורה לציון האנגלית הקודם?</h3>
            <p>
              גם הוא תקף לשבע שנים לפחות, בין שהתקבל בפסיכומטרי ובין שהתקבל באמי״ר, אמיר״ם או
              אמירנט. בדקו שהוא עונה על דרישת האנגלית של התוכנית שלכם לפני הרשמה לבחינה נוספת.
            </p>
            <p className={styles.source}>
              <a href={nite.faq}>תוקף הציונים והאנגלית לפי מאל״ו</a>
            </p>
          </section>

          <section aria-labelledby="admissions" className={styles.section}>
            <h2 id="admissions">איזה ציון ייחשב בקבלה לתשפ״ח?</h2>
            <p id="admissions-answer">
              איזה ציון פסיכומטרי ייחשב בקבלה? זה תלוי במוסד ובשנת הלימודים. בטבלה כאן מובא הכלל שכל
              מוסד פרסם לתשפ״ח, עם קישור רשמי ותאריך בדיקה. באוניברסיטת בן־גוריון, לנבחנים שלפני
              דצמבר <bdi dir="ltr">2026</bdi> ייחשב הציון הגבוה מבין הציון הרב־תחומי לבין הציון
              הדו־תחומי. מוסדות שלא נמצא אצלם כלל מופיעים עם קישור בלבד.
            </p>
            <table className={styles.admissionsTable} aria-labelledby="admissions">
              <thead>
                <tr>
                  <th scope="col">מוסד</th>
                  <th scope="col">איזה ציון נחשב?</th>
                  <th scope="col">מקור רשמי</th>
                  <th scope="col">נבדק בתאריך</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">אוניברסיטת בן־גוריון בנגב</th>
                  <td>
                    לנבחנים לפני דצמבר <bdi dir="ltr">2026</bdi>: הגבוה מבין הציון הרב־תחומי המקורי
                    והציון הדו־תחומי המחושב ממנו. לנבחנים במתכונת החדשה: הציון הדו־תחומי. אין צורך
                    להיבחן שוב רק בגלל השינוי. הכלל מתייחס לציון הכללי; למסלולים המשתמשים בסכם כמותי
                    או בסכם הנדסה יש חישוב נפרד, כמפורט במקור.
                  </td>
                  <td>
                    <a href="https://www.bgu.ac.il/welcome/blog/articles/new-psychometry/">
                      מדיניות בן־גוריון
                    </a>
                  </td>
                  <td>
                    <span className={styles.mobileDateLabel}>נבדק בתאריך </span>
                    <time dateTime="2026-11-14">
                      <bdi dir="ltr">14.11.2026</bdi>
                    </time>
                  </td>
                </tr>
                <tr>
                  <th scope="row">אוניברסיטת תל אביב</th>
                  <td>
                    במתכונת הישנה: הגבוה מבין הציון התלת־תחומי והציון הדו־תחומי מאותו מועד. במתכונת
                    החדשה: הציון הדו־תחומי. למי שנבחנו בשתי המתכונות: הגבוה מבין שלושת הציונים —
                    התלת־תחומי הישן, הדו־תחומי המחושב מהבחינה הישנה והדו־תחומי החדש. המדיניות לתשפ״ח
                    היא פיילוט לשנתיים.
                  </td>
                  <td>
                    <a href="https://go.tau.ac.il/he/psychometric-test">מדיניות תל אביב</a>
                    <a href="https://go.tau.ac.il/he/ba/psycho">עמוד הפסיכומטרי</a>
                  </td>
                  <td>
                    <span className={styles.mobileDateLabel}>נבדק בתאריך </span>
                    <time dateTime="2026-11-14">
                      <bdi dir="ltr">14.11.2026</bdi>
                    </time>
                  </td>
                </tr>
                <tr>
                  <th scope="row">האוניברסיטה העברית</th>
                  <td>לא נמצא כלל לתשפ״ח בעמוד שנבדק. בדקו באתר המוסד.</td>
                  <td>
                    <a href="https://info.huji.ac.il/reception-components/Psychometric">
                      הנחיות הפסיכומטרי
                    </a>
                  </td>
                  <td>
                    <span className={styles.mobileDateLabel}>נבדק בתאריך </span>
                    <time dateTime="2026-11-14">
                      <bdi dir="ltr">14.11.2026</bdi>
                    </time>
                  </td>
                </tr>
                <tr>
                  <th scope="row">אוניברסיטת חיפה</th>
                  <td>לא נמצא כלל לתשפ״ח בעמוד שנבדק. בדקו באתר המוסד.</td>
                  <td>
                    <a href="https://admissions.haifa.ac.il/psychometric-amirnet-yaelnet-tests/">
                      מידע על הבחינות
                    </a>
                  </td>
                  <td>
                    <span className={styles.mobileDateLabel}>נבדק בתאריך </span>
                    <time dateTime="2026-11-14">
                      <bdi dir="ltr">14.11.2026</bdi>
                    </time>
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              המוסד קובע איזה ציון לקבל ואיך לשקלל אנגלית: כחלק מהסכם, כדרישת סף או לצורך סיווג
              לרמות. אין כלל אחד שמתאים לכל התוכניות.{' '}
              <a href={nite.faq}>להסבר מאל״ו על מדיניות המוסדות</a>.
            </p>
            <p>בעמוד תנאי הקבלה של התוכנית, בדקו את הפרטים הבאים לשנת הלימודים שאליה אתם נרשמים:</p>
            <ul>
              <li>איזה סוג ציון נדרש, ואיך מתייחסים לציונים מבחינות קודמות.</li>
              <li>מהי דרישת האנגלית, ואיזה ציון או פטור מוכרים לצורך עמידה בה.</li>
              <li>מהו המועד האחרון לבחינה ולמסירת הציונים.</li>
              <li>אילו דרישות נוספות צריך להשלים לצד הפסיכומטרי.</li>
            </ul>
            <p>
              לפני שבוחרים מועד לבחינה, בדקו{' '}
              <Link href="/psychometric-dates#semester-validity" prefetch={false}>
                איזה מועד נחשב לאיזה סמסטר
              </Link>
              .
            </p>
            <Link className={styles.nextLink} href="/institutions" prefetch={false}>
              למציאת מוסדות ותוכניות לימודים
            </Link>
          </section>

          <section aria-labelledby="questions" className={styles.section}>
            <h2 id="questions">שאלות נפוצות</h2>
            <h3>כדאי להיבחן שוב רק כי האנגלית יצאה מהבחינה?</h3>
            <p>
              לפני שמחליטים, פתחו את הציונים שכבר יש לכם ובדקו איזה מהם התוכנית מקבלת. עצם השינוי
              במבנה הבחינה אינו אומר שנדרשת בחינה חדשה או שסיכויי הקבלה השתפרו.
            </p>
            <h3>איך מתכוננים אם משתמשים בחומרי לימוד ישנים?</h3>
            <p>
              השוו אותם ל<a href={nite.preparation}>חומרי ההתנסות למתכונת החדשה</a>: ודאו שאתם
              מתרגלים את מבנה הבחינה הנכון. את ההכנה לאנגלית תכננו לפי{' '}
              <a href={nite.amirnet}>המידע העדכני על אמירנט</a>.
            </p>
            <h3>אפשר להיבחן בפסיכומטרי במועדים רצופים?</h3>
            <p>
              כן. לפי מאל״ו, אפשר להיבחן בכל מועד שבו הבחינה מתקיימת, ואין הגבלה על מספר הפעמים שבהן
              אפשר לגשת לבחינה. בחרו מועד לפי זמן ההכנה שלכם והמועד האחרון שבו התוכנית מקבלת ציונים.
            </p>
            <p>
              <a href={nite.faq}>להנחיות מאל״ו על בחינות חוזרות</a>
              {' · '}
              <Link href="/psychometric-dates">למועדי הפסיכומטרי וסיום ההרשמה</Link>
            </p>
            <h3>יש לכם שאלה על הבחינה או על הקבלה?</h3>
            <p>
              על הבחינה והציונים אפשר לקרוא ב<a href={nite.faq}>שאלות ותשובות של מאל״ו</a>. לשאלה
              איזה ציון ייחשב בקבלה שלכם, פנו למוסד עם שם התוכנית, שנת הלימודים ומועדי הבחינות שבהם
              נבחנתם.
            </p>
          </section>
        </article>
      </main>
    </WayPageShell>
  );
}
